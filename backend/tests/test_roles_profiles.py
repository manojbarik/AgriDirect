from uuid import UUID

from sqlalchemy import select

from app.db.models.people import ConsumerProfile, LogisticsPartnerProfile, User
from app.modules.identity.dependencies import require_roles
from tests.helpers import verify_user


def _register(client, phone, role):
    resp = client.post(
        "/api/v1/auth/register",
        json={"phone_e164": phone, "role": role, "password": "testpass123"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _get_user(db, user_id_str):
    return db.scalar(select(User).where(User.id == UUID(user_id_str)))


def test_register_farmer(client, db):
    reg = _register(client, "+919100000001", "FARMER")
    verify_user(client, reg)
    user = _get_user(db, reg["user_id"])
    assert user is not None
    assert user.role == "FARMER"


def test_register_buyer(client, db):
    reg = _register(client, "+919100000002", "BUYER")
    verify_user(client, reg)
    user = _get_user(db, reg["user_id"])
    assert user is not None
    assert user.role == "BUYER"


def test_register_consumer_creates_profile(client, db):
    reg = _register(client, "+919100000004", "CONSUMER")
    verify_user(client, reg)
    user = _get_user(db, reg["user_id"])
    assert user.role == "CONSUMER"
    profile = db.scalar(select(ConsumerProfile).where(ConsumerProfile.user_id == user.id))
    assert profile is not None


def test_register_logistics_creates_profile(client, db):
    reg = _register(client, "+919100000005", "LOGISTICS")
    verify_user(client, reg)
    user = _get_user(db, reg["user_id"])
    assert user.role == "LOGISTICS"
    profile = db.scalar(
        select(LogisticsPartnerProfile).where(LogisticsPartnerProfile.user_id == user.id)
    )
    assert profile is not None
    assert profile.company_name.startswith("Logistics-")
    assert profile.verification_status == "PENDING"


def test_require_roles_works_for_new_roles(db):
    consumer = User(phone_e164="+919100000011", role="CONSUMER", status="ACTIVE")
    logistics = User(phone_e164="+919100000012", role="LOGISTICS", status="ACTIVE")
    farmer = User(phone_e164="+919100000013", role="FARMER", status="ACTIVE")
    db.add_all([consumer, logistics, farmer])
    db.commit()

    dep = require_roles("CONSUMER", "LOGISTICS")
    assert dep(current_user=consumer) is consumer
    assert dep(current_user=logistics) is logistics

    import pytest
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        dep(current_user=farmer)
    assert exc.value.status_code == 403


def test_admin_overview_includes_new_roles(client, db):
    from tests.helpers import admin_user

    admin = admin_user(db, phone="+919100000099")
    for phone, role in [
        ("+919100000021", "CONSUMER"),
        ("+919100000022", "LOGISTICS"),
    ]:
        _register(client, phone, role)

    resp = client.get("/api/v1/admin/overview", headers=admin["headers"])
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_users"] >= 3
