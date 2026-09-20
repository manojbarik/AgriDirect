import logging
from collections.abc import Iterator
from uuid import UUID

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.models.identity import OtpChallenge
from app.db.models.people import User
from app.db.session import get_db
from app.main import app
from app.modules.identity.dependencies import get_current_user, require_roles
from app.modules.identity.security import create_access_token, hash_password

PHONE = "+919000000001"
PASSWORD = "sandboxpass123"


@pytest.fixture
def engine() -> Iterator[Engine]:
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db() -> Iterator[Session]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSessionLocal()
    yield session
    session.close()


def register(
    client: TestClient,
    phone: str = PHONE,
    role: str = "FARMER",
    password: str = PASSWORD,
) -> dict:
    resp = client.post(
        "/api/v1/auth/register",
        json={"phone_e164": phone, "role": role, "password": password},
    )
    assert resp.status_code == 201
    return resp.json()


def verify(client: TestClient, challenge_id: str, code: str) -> dict:
    resp = client.post(
        "/api/v1/auth/otp/verify",
        json={"challenge_id": challenge_id, "code": code},
    )
    assert resp.status_code == 200
    return resp.json()


def login(client: TestClient, phone: str = PHONE, password: str = PASSWORD):
    return client.post(
        "/api/v1/auth/login",
        json={"phone_e164": phone, "password": password},
    )


def test_register_returns_mock_challenge(client: TestClient) -> None:
    data = register(client)
    assert data["challenge_id"]
    assert data["mock_code"] == "000001"
    assert data["status"] == "PENDING"
    assert data["role"] == "FARMER"


def test_email_auth_uses_email_otp_and_recipient_throttle(
    client: TestClient, db: Session
) -> None:
    email = "farmer@example.com"
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "phone_e164": "+919000000009",
            "email": email,
            "role": "FARMER",
            "password": PASSWORD,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    challenge = db.get(OtpChallenge, UUID(data["challenge_id"]))
    assert challenge is not None
    assert challenge.channel == "EMAIL"
    assert data["email"] == email
    assert client.post("/api/v1/auth/otp/resend", json={"user_id": data["user_id"]}).status_code == 429
    assert verify(client, data["challenge_id"], data["mock_code"])["status"] == "ACTIVE"
    assert client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    ).status_code == 200


def test_register_allows_pending_reregistration_and_rejects_active_duplicate(client: TestClient) -> None:
    data = register(client)
    # Re-registering while unverified should succeed and refresh challenge
    resp_pending = client.post(
        "/api/v1/auth/register",
        json={"phone_e164": PHONE, "role": "FARMER", "password": PASSWORD},
    )
    assert resp_pending.status_code == 201

    # Verify the user
    verify(client, resp_pending.json()["challenge_id"], resp_pending.json()["mock_code"])

    # Now that user is ACTIVE, duplicate registration must be rejected with 409
    resp_active = client.post(
        "/api/v1/auth/register",
        json={"phone_e164": PHONE, "role": "BUYER", "password": PASSWORD},
    )
    assert resp_active.status_code == 409


def test_register_rejects_invalid_phone(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={"phone_e164": "not-a-phone", "role": "FARMER", "password": PASSWORD},
    )
    assert resp.status_code == 422


def test_register_rejects_short_password(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={"phone_e164": PHONE, "role": "FARMER", "password": "short"},
    )
    assert resp.status_code == 422


def test_verify_with_wrong_code_is_rejected(client: TestClient) -> None:
    data = register(client)
    resp = client.post(
        "/api/v1/auth/otp/verify",
        json={"challenge_id": data["challenge_id"], "code": "wrong"},
    )
    assert resp.status_code == 401


def test_verify_locks_challenge_after_attempts(client: TestClient) -> None:
    data = register(client)
    for _ in range(5):
        assert (
            client.post(
                "/api/v1/auth/otp/verify",
                json={"challenge_id": data["challenge_id"], "code": "999999"},
            ).status_code
            == 401
        )
    resp = client.post(
        "/api/v1/auth/otp/verify",
        json={"challenge_id": data["challenge_id"], "code": data["mock_code"]},
    )
    assert resp.status_code == 401


def test_verify_completes_registration_and_me(client: TestClient) -> None:
    reg = register(client, role="BUYER")
    data = verify(client, reg["challenge_id"], reg["mock_code"])
    assert data["status"] == "ACTIVE"
    tokens = data["tokens"]
    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me.status_code == 200
    body = me.json()
    assert body["role"] == "BUYER"
    assert body["status"] == "ACTIVE"
    assert body["phone_e164"] == PHONE
    assert "password" not in body


def test_me_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401


def test_role_returns_current_user_role(client: TestClient) -> None:
    reg = register(client, role="BUYER")
    tokens = verify(client, reg["challenge_id"], reg["mock_code"])["tokens"]
    resp = client.get(
        "/api/v1/auth/role",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"role": "BUYER"}
    assert client.get("/api/v1/auth/role").status_code == 401


def test_resend_issues_new_challenge(client: TestClient) -> None:
    reg = register(client)
    old_challenge = reg["challenge_id"]
    resp = client.post("/api/v1/auth/otp/resend", json={"user_id": reg["user_id"]})
    assert resp.status_code == 200
    new_challenge = resp.json()["challenge_id"]
    assert new_challenge != old_challenge
    old_verify = client.post(
        "/api/v1/auth/otp/verify",
        json={"challenge_id": old_challenge, "code": reg["mock_code"]},
    )
    assert old_verify.status_code == 401


def test_login_with_password_rejects_unverified_account(client: TestClient) -> None:
    register(client)
    resp = login(client)
    assert resp.status_code == 403


def test_login_with_password_succeeds_after_verification(client: TestClient) -> None:
    reg = register(client, role="BUYER")
    verify(client, reg["challenge_id"], reg["mock_code"])
    resp = login(client)
    assert resp.status_code == 200
    tokens = resp.json()["tokens"]
    assert tokens["access_token"] and tokens["refresh_token"]
    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["role"] == "BUYER"


def test_login_rejects_unknown_phone(client: TestClient) -> None:
    assert login(client, phone="+919999999999").status_code == 401


def test_login_rejects_wrong_password(client: TestClient) -> None:
    reg = register(client)
    verify(client, reg["challenge_id"], reg["mock_code"])
    resp = login(client, password="wrongpassword")
    assert resp.status_code == 401


def test_refresh_rotation(client: TestClient) -> None:
    reg = register(client)
    tokens = verify(client, reg["challenge_id"], reg["mock_code"])["tokens"]

    first = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert first.status_code == 200
    rotated = first.json()["tokens"]

    reused = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert reused.status_code == 401

    second = client.post("/api/v1/auth/refresh", json={"refresh_token": rotated["refresh_token"]})
    assert second.status_code == 200


def test_logout_revokes_refresh_token(client: TestClient) -> None:
    reg = register(client)
    tokens = verify(client, reg["challenge_id"], reg["mock_code"])["tokens"]

    logout = client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert logout.status_code == 204

    refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refresh.status_code == 401


def test_credentials_are_never_logged(client: TestClient, caplog: pytest.LogCaptureFixture) -> None:
    secret_password = "Sup3rSecretPass!"
    with caplog.at_level(logging.INFO):
        reg = register(client, password=secret_password)
        verify(client, reg["challenge_id"], reg["mock_code"])
        resp = login(client, password=secret_password)
        assert resp.status_code == 200
    access_token = resp.json()["tokens"]["access_token"]
    refresh_token = resp.json()["tokens"]["refresh_token"]

    assert secret_password not in caplog.text
    assert access_token not in caplog.text
    assert refresh_token not in caplog.text
    for line in caplog.text.splitlines():
        if reg["mock_code"] in line:
            assert PHONE in line, "the mock OTP code must never be logged on its own"


def test_admin_overview_requires_admin_role(client: TestClient, db: Session) -> None:
    admin = User(
        phone_e164="+919000000100",
        role="ADMIN",
        status="ACTIVE",
        password_hash=hash_password(PASSWORD),
    )
    farmer = User(
        phone_e164="+919000000101",
        role="FARMER",
        status="ACTIVE",
        password_hash=hash_password(PASSWORD),
    )
    db.add_all([admin, farmer])
    db.commit()

    admin_token, _ = create_access_token(str(admin.id), admin.role)
    farmer_token, _ = create_access_token(str(farmer.id), farmer.role)

    ok = client.get(
        "/api/v1/admin/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["total_users"] == 2
    assert body["admins"] == 1
    assert body["farmers"] == 1

    denied = client.get(
        "/api/v1/admin/overview",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert denied.status_code == 403

    anonymous = client.get("/api/v1/admin/overview")
    assert anonymous.status_code == 401


def test_require_roles_authorization(db: Session) -> None:
    farmer = User(phone_e164="+919000000002", role="FARMER", status="ACTIVE")
    buyer = User(phone_e164="+919000000003", role="BUYER", status="ACTIVE")
    db.add_all([farmer, buyer])
    db.commit()

    farmer_only = require_roles("FARMER")
    assert farmer_only(current_user=farmer) is farmer
    with pytest.raises(HTTPException) as exc:
        farmer_only(current_user=buyer)
    assert exc.value.status_code == 403


def test_get_current_user_status_checks(db: Session) -> None:
    active = User(phone_e164="+919000000004", role="FARMER", status="ACTIVE")
    suspended = User(phone_e164="+919000000005", role="FARMER", status="SUSPENDED")
    db.add_all([active, suspended])
    db.commit()

    active_token, _ = create_access_token(str(active.id), active.role)
    suspended_token, _ = create_access_token(str(suspended.id), suspended.role)

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=active_token)
    assert get_current_user(credentials=credentials, db=db).id == active.id

    with pytest.raises(HTTPException) as exc:
        get_current_user(
            credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials=suspended_token),
            db=db,
        )
    assert exc.value.status_code == 401
