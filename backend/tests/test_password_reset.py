from sqlalchemy import select

from app.db.models.identity import PasswordResetToken
from app.db.models.people import User
from app.modules.identity.security import hash_password
from tests.helpers import PHONE, register_user, verify_user


def _create_active_user(db, phone=PHONE, email="reset.owner@example.test", role="FARMER"):
    user = User(
        phone_e164=phone,
        email=email,
        role=role,
        status="ACTIVE",
        password_hash=hash_password("old-pass-123"),
    )
    db.add(user)
    db.commit()
    return user


def _request_reset(client, identifier):
    return client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": identifier},
    )


def test_forgot_password_returns_generic_message(client, db):
    resp = _request_reset(client, "no.such.account@example.test")
    assert resp.status_code == 200
    body = resp.json()
    assert "reset link has been sent" in body["message"]
    assert body["expires_in_minutes"] >= 1
    assert db.scalar(select(PasswordResetToken)) is None


def test_forgot_password_for_known_user_creates_hash_only(db):
    from app.modules.identity.schemas import ForgotPasswordRequest
    from app.modules.identity.service import request_password_reset

    user = _create_active_user(db)
    resp = request_password_reset(db, ForgotPasswordRequest(identifier=user.email))
    token = db.scalar(select(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    assert token is not None
    assert resp.mock_reset_token is not None and token.token_hash is not None
    assert token.token_hash != resp.mock_reset_token


def test_forgot_password_by_phone(client, db):
    user = _create_active_user(db, phone="+919876543210", email=None)
    resp = _request_reset(client, "+919876543210")
    assert resp.status_code == 200
    assert resp.json()["mock_reset_token"] is not None
    token = db.scalar(select(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    assert token is not None
    assert token.token_hash != resp.json()["mock_reset_token"]


def test_full_reset_flow_changes_password(client, db):
    user = _create_active_user(db, phone="+919111111111", email="consumer@example.test", role="CONSUMER")
    req = _request_reset(client, user.email)
    token = req.json()["mock_reset_token"]
    assert token is not None

    session_record = db.scalar(select(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    assert session_record.token_hash != token

    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "brand-new-pass-456"},
    )
    assert resp.status_code == 200
    db.refresh(user)
    from app.modules.identity.security import password_matches

    assert password_matches(user.password_hash, "brand-new-pass-456")

    login = client.post(
        "/api/v1/auth/login",
        json={"phone_e164": user.phone_e164, "password": "old-pass-123"},
    )
    assert login.status_code == 401

    login = client.post(
        "/api/v1/auth/login",
        json={"phone_e164": user.phone_e164, "password": "brand-new-pass-456"},
    )
    assert login.status_code == 200


def test_reset_token_is_one_time(client, db):
    user = _create_active_user(db, phone="+919222222222", email="one.time@example.test")
    token = _request_reset(client, user.email).json()["mock_reset_token"]

    ok = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "new-password-111"},
    )
    assert ok.status_code == 200

    replay = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "another-password-222"},
    )
    assert replay.status_code == 400
    assert "invalid or has already been used" in replay.json()["detail"]


def test_reset_with_unknown_token(client, db):
    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "A" * 64, "new_password": "brand-new-pass-456"},
    )
    assert resp.status_code == 400
    assert "invalid or has already been used" in resp.json()["detail"]


def test_expired_reset_token_is_rejected(client, db):
    from datetime import UTC, datetime, timedelta

    from app.modules.identity.security import hash_token

    user = _create_active_user(db, phone="+919333333333", email="expired@example.test")
    expired = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_token("EXPIREDTOKEN" * 4),
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
    )
    db.add(expired)
    db.commit()

    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "EXPIREDTOKEN" * 4, "new_password": "brand-new-pass-456"},
    )
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"]


def test_reset_revokes_active_refresh_sessions(client, db):
    user = _create_active_user(db, phone="+919444444444", email="revoke@example.test")
    token = _request_reset(client, user.email).json()["mock_reset_token"]

    login = client.post(
        "/api/v1/auth/login",
        json={"phone_e164": user.phone_e164, "password": "old-pass-123"},
    )
    refresh_token = login.json()["tokens"]["refresh_token"]

    client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "brand-new-pass-456"},
    )

    refreshed = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refreshed.status_code in (400, 401)


def test_register_and_reset_from_scratch(client, db):
    reg = register_user(client, "+919555555555", role="BUYER", password="original-pass-1")
    verify_user(client, reg)

    req = _request_reset(client, "+919555555555")
    token = req.json()["mock_reset_token"]
    assert token is not None

    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "was-reset-pass-2"},
    )
    assert resp.status_code == 200

    login = client.post(
        "/api/v1/auth/login",
        json={"phone_e164": "+919555555555", "password": "was-reset-pass-2"},
    )
    assert login.status_code == 200
    assert db.scalar(select(PasswordResetToken)) is not None


def test_reset_requires_strong_password(client, db):
    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "A" * 64, "new_password": "short"},
    )
    assert resp.status_code == 422