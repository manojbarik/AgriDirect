"""Regression tests for the Phase 21 security hardening.

Covers the abuse/brute-force throttles (per-IP rate limiting, per-phone login
lockout, OTP resend cooldown), the fail-fast JWT secret policy, and the payment
webhook signature enforcement in non-development environments.
"""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.modules.identity import security
from app.modules.payments import service as payments_service
from app.modules.payments.schemas import WebhookEvent

STRONG_SECRET = "x" * 64


def _settings(**overrides) -> Settings:
    return Settings(_env_file=None, **overrides)


def _register(client: TestClient, phone: str) -> dict:
    resp = client.post(
        "/api/v1/auth/register",
        json={"phone_e164": phone, "role": "FARMER", "password": "sandboxpass123"},
    )
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# JWT secret policy
# ---------------------------------------------------------------------------


def test_jwt_secret_refuses_insecure_fallback_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: _settings(app_env="production", jwt_secret_key=""),
    )
    with pytest.raises(RuntimeError):
        security.get_jwt_secret()
    with pytest.raises(RuntimeError):
        security.create_access_token("user-1", "ADMIN")


def test_jwt_secret_accepts_strong_secret_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: _settings(app_env="production", jwt_secret_key=STRONG_SECRET),
    )
    token, _ = security.create_access_token("user-1", "ADMIN")
    payload = security.decode_access_token(token)
    assert payload["sub"] == "user-1"
    assert payload["role"] == "ADMIN"
    assert payload["aud"] == security.JWT_AUDIENCE


def test_unsupported_jwt_algorithm_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: _settings(app_env="development", jwt_secret_key="", jwt_algorithm="none"),
    )
    with pytest.raises(RuntimeError):
        security.create_access_token("user-1", "FARMER")


def test_access_token_requires_audience(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: _settings(app_env="development", jwt_secret_key=""),
    )
    from datetime import UTC, datetime, timedelta

    import jwt as pyjwt

    now = datetime.now(UTC)
    wrong_audience = pyjwt.encode(
        {
            "sub": "user-1",
            "role": "FARMER",
            "type": "access",
            "aud": "some-other-app",
            "iat": now,
            "exp": now + timedelta(minutes=15),
        },
        security.DEV_JWT_SECRET,
        algorithm="HS256",
    )
    with pytest.raises(pyjwt.InvalidAudienceError):
        security.decode_access_token(wrong_audience)

    token, _ = security.create_access_token("user-1", "FARMER")
    assert security.decode_access_token(token)["aud"] == "marketplace-api"


# ---------------------------------------------------------------------------
# Login / register / OTP throttles
# ---------------------------------------------------------------------------


def test_login_rate_limited_by_ip(client: TestClient) -> None:
    for i in range(20):
        resp = client.post(
            "/api/v1/auth/login",
            json={"phone_e164": f"+919800000{i:02d}", "password": "wrong"},
        )
        assert resp.status_code == 401
    blocked = client.post(
        "/api/v1/auth/login",
        json={"phone_e164": "+919800000199", "password": "wrong"},
    )
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_login_locks_out_after_phone_failures(client: TestClient) -> None:
    reg = _register(client, "+919200000001")
    client.post(
        "/api/v1/auth/otp/verify",
        json={"challenge_id": reg["challenge_id"], "code": reg["mock_code"]},
    )
    for _ in range(10):
        resp = client.post(
            "/api/v1/auth/login",
            json={"phone_e164": "+919200000001", "password": "wrong"},
        )
        assert resp.status_code == 401
    locked = client.post(
        "/api/v1/auth/login",
        json={"phone_e164": "+919200000001", "password": "sandboxpass123"},
    )
    assert locked.status_code == 429


def test_register_rate_limited_by_ip(client: TestClient) -> None:
    for i in range(5):
        assert _register(client, f"+9191000000{i:02d}")["status"] == "PENDING"
    blocked = client.post(
        "/api/v1/auth/register",
        json={"phone_e164": "+919100000099", "role": "FARMER", "password": "sandboxpass123"},
    )
    assert blocked.status_code == 429


def test_otp_resend_enforces_cooldown(client: TestClient) -> None:
    reg = _register(client, "+919300000001")
    first = client.post("/api/v1/auth/otp/resend", json={"user_id": reg["user_id"]})
    assert first.status_code == 200
    assert first.json()["challenge_id"] != reg["challenge_id"]
    second = client.post("/api/v1/auth/otp/resend", json={"user_id": reg["user_id"]})
    assert second.status_code == 429


# ---------------------------------------------------------------------------
# Payment webhook signature enforcement
# ---------------------------------------------------------------------------


def _webhook_event() -> WebhookEvent:
    return WebhookEvent(
        event="payment.captured",
        reference="mock-int-order-1",
        event_id="evt-test-1",
    )


def test_webhook_unconfigured_in_production_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        payments_service,
        "get_settings",
        lambda: _settings(app_env="production", payment_webhook_secret=""),
    )
    with pytest.raises(HTTPException) as exc:
        payments_service.handle_webhook(None, "mock", _webhook_event(), None)
    assert exc.value.status_code == 503


def test_webhook_rejects_missing_or_bad_signature(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        payments_service,
        "get_settings",
        lambda: _settings(app_env="production", payment_webhook_secret="sekrit"),
    )
    with pytest.raises(HTTPException) as exc:
        payments_service.handle_webhook(None, "mock", _webhook_event(), None)
    assert exc.value.status_code == 401
    with pytest.raises(HTTPException) as exc:
        payments_service.handle_webhook(None, "mock", _webhook_event(), "forged")
    assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Defense-in-depth: headers, log redaction, proxy IP trust, timing equalization
# ---------------------------------------------------------------------------


def test_security_headers_present(client: TestClient) -> None:
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["referrer-policy"] == "no-referrer"
    assert "default-src 'none'" in resp.headers["content-security-policy"]


def test_log_redaction_masks_sensitive_values() -> None:
    from app.core.logging import redact_text

    assert redact_text("sending challenge to +919000000001") == (
        "sending challenge to +***********"
    )
    assert "***" in redact_text("Authorization: Bearer abc.def123.GHI_jkl")
    assert "***" in redact_text("password=Sup3rSecretPass!")
    assert redact_text("provider reference mock-int-1") == "provider reference mock-int-1"


def test_client_ip_respects_proxy_trust(monkeypatch: pytest.MonkeyPatch) -> None:
    from starlette.requests import Request

    from app.core import rate_limit as rate_limit_module
    from app.core.rate_limit import client_ip

    scope = {
        "type": "http",
        "client": ("1.2.3.4", 4321),
        "headers": [(b"x-forwarded-for", b"9.9.9.9, 8.8.8.8")],
        "method": "GET",
        "path": "/",
        "raw_path": b"/",
        "query_string": b"",
        "scheme": "http",
        "server": ("test", 80),
        "root_path": "",
    }
    request = Request(scope)

    monkeypatch.setattr(
        rate_limit_module,
        "get_settings",
        lambda: _settings(trust_proxy_headers=False),
    )
    assert client_ip(request) == "1.2.3.4"

    monkeypatch.setattr(
        rate_limit_module,
        "get_settings",
        lambda: _settings(trust_proxy_headers=True),
    )
    assert client_ip(request) == "9.9.9.9"


def test_proxy_forwarded_header_does_not_bypass_rate_limit(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core import rate_limit as rate_limit_module

    monkeypatch.setattr(
        rate_limit_module,
        "get_settings",
        lambda: _settings(trust_proxy_headers=False),
    )
    response = None
    for i in range(21):
        response = client.post(
            "/api/v1/auth/login",
            json={"phone_e164": f"+919700000{i:02d}", "password": "wrong"},
            headers={"X-Forwarded-For": f"10.0.{i}.1"},
        )
    assert response is not None
    assert response.status_code == 429