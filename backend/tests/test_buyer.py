from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.modules.identity.security import create_access_token, hash_password
from tests.helpers import (
    bearer,
    complete_buyer,
    complete_farmer,
    create_crop,
    register_user,
    verify_user,
)

BUYER_A = "+919000000030"
BUYER_B = "+919000000031"


def _basic_buyer(client: TestClient, db: Session, phone: str = BUYER_B) -> dict:
    reg = register_user(client, phone=phone, role="BUYER")
    tokens = verify_user(client, reg)["tokens"]
    headers = bearer(tokens["access_token"])
    resp = client.post(
        "/api/v1/buyer/profile",
        headers=headers,
        json={
            "full_name": "Test Buyer",
            "buyer_type": "RESTAURANT",
            "business_name": "Test Diner",
        },
    )
    assert resp.status_code == 201
    return {"headers": headers}


def test_buyer_endpoints_require_roles(client: TestClient, db: Session) -> None:
    reg = register_user(client, role="FARMER")
    farmer_token = verify_user(client, reg)["tokens"]["access_token"]
    assert client.get("/api/v1/buyer/profile", headers=bearer(farmer_token)).status_code == 403
    assert client.get("/api/v1/buyer/profile").status_code == 401


def test_create_get_update_profile(client: TestClient, db: Session) -> None:
    reg = register_user(client, role="BUYER")
    headers = bearer(verify_user(client, reg)["tokens"]["access_token"])

    created = client.post(
        "/api/v1/buyer/profile",
        headers=headers,
        json={
            "full_name": "Priya Sharma",
            "buyer_type": "RESTAURANT",
            "business_name": "Spice Route",
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["full_name"] == "Priya Sharma"
    assert body["buyer_type"] == "RESTAURANT"
    assert body["verification_status"] == "PENDING"
    assert body["payment_verification_status"] == "PENDING"

    fetched = client.get("/api/v1/buyer/profile", headers=headers)
    assert fetched.status_code == 200

    updated = client.put(
        "/api/v1/buyer/profile",
        headers=headers,
        json={"full_name": "Priya S", "business_name": "Spice Route Pune"},
    )
    assert updated.status_code == 200
    assert updated.json()["full_name"] == "Priya S"
    assert updated.json()["business_name"] == "Spice Route Pune"


def test_create_profile_conflict(client: TestClient, db: Session) -> None:
    reg = register_user(client, role="BUYER")
    headers = bearer(verify_user(client, reg)["tokens"]["access_token"])
    payload = {"full_name": "Priya", "buyer_type": "INDIVIDUAL"}
    assert client.post("/api/v1/buyer/profile", headers=headers, json=payload).status_code == 201
    assert client.post("/api/v1/buyer/profile", headers=headers, json=payload).status_code == 409


def test_create_profile_rejects_invalid_buyer_type(client: TestClient, db: Session) -> None:
    reg = register_user(client, role="BUYER")
    headers = bearer(verify_user(client, reg)["tokens"]["access_token"])
    resp = client.post(
        "/api/v1/buyer/profile",
        headers=headers,
        json={"full_name": "Priya", "buyer_type": "GOVERNMENT"},
    )
    assert resp.status_code == 422


def test_identity_verification_pending_when_incomplete(client: TestClient, db: Session) -> None:
    reg = register_user(client, role="BUYER")
    headers = bearer(verify_user(client, reg)["tokens"]["access_token"])
    profile = client.post(
        "/api/v1/buyer/profile",
        headers=headers,
        json={"full_name": "Test Buyer", "buyer_type": "INDIVIDUAL"},
    )
    assert profile.status_code == 201

    resp = client.post("/api/v1/buyer/verification/identity/submit", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["verification_status"] == "VERIFIED"

    resp = client.post("/api/v1/buyer/verification/payment/submit", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["verification_status"] == "PENDING"
    assert "payment address" in body["reason"]


def test_business_buyer_requires_business_name(client: TestClient, db: Session) -> None:
    reg = register_user(client, role="BUYER")
    headers = bearer(verify_user(client, reg)["tokens"]["access_token"])
    profile = client.post(
        "/api/v1/buyer/profile",
        headers=headers,
        json={"full_name": "Karan", "buyer_type": "HOTEL_HOSTEL"},
    )
    assert profile.status_code == 201

    resp = client.post("/api/v1/buyer/verification/identity/submit", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["verification_status"] == "PENDING"
    assert "business name" in body["reason"]


def test_status_reports_onboarding_progress(client: TestClient, db: Session) -> None:
    buyer = _basic_buyer(client, db)
    headers = buyer["headers"]
    resp = client.get("/api/v1/buyer/status", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["verification_status"] == "PENDING"
    assert body["payment_verification_status"] == "PENDING"
    assert body["completion_percent"] == 40
    assert body["identity_can_submit"] is True
    assert body["payment_can_submit"] is False
    done_keys = {step["key"] for step in body["steps"] if step["done"]}
    assert done_keys == {"buyer_type", "basic"}


def test_location_update_preserves_existing_fields(client: TestClient, db: Session) -> None:
    buyer = complete_buyer(client, db, phone=BUYER_A, verified=False)
    headers = buyer["headers"]
    resp = client.put(
        "/api/v1/buyer/location",
        headers=headers,
        json={"state": "Karnataka", "district": "Bengaluru"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["state"] == "Karnataka"
    assert body["district"] == "Bengaluru"
    assert body["locality"] == "Test market"


def test_payment_verification_full_flow(client: TestClient, db: Session) -> None:
    buyer = complete_buyer(client, db, phone=BUYER_A)
    headers = buyer["headers"]
    profile = client.get("/api/v1/buyer/profile", headers=headers).json()
    assert profile["verification_status"] == "VERIFIED"
    assert profile["payment_verification_status"] == "VERIFIED"
    assert profile["payment_profile_reference"] == "mock-payment-ok"

    resp = client.get("/api/v1/buyer/status", headers=headers)
    assert resp.json()["completion_percent"] == 100
    assert resp.json()["payment_can_submit"] is True


def test_demand_create_and_list(client: TestClient, db: Session) -> None:
    buyer = complete_buyer(client, db, phone=BUYER_A)
    headers = buyer["headers"]
    crop = create_crop(db, name="Onion", variety="Red")

    created = client.post(
        "/api/v1/buyer/demands",
        headers=headers,
        json={
            "crop_id": str(crop.id),
            "requested_quantity": "250.000",
            "unit": "kg",
            "target_min_price": "15.00",
            "target_max_price": "22.00",
            "required_by": "2026-11-30",
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "DRAFT"
    assert body["crop_name"] == "Onion"
    assert body["state"] == "Maharashtra"
    assert body["district"] == "Pune"

    listed = client.get("/api/v1/buyer/demands", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_demand_rejects_unknown_crop_and_bad_price_range(client: TestClient, db: Session) -> None:
    buyer = complete_buyer(client, db, phone=BUYER_A)
    headers = buyer["headers"]
    missing = client.post(
        "/api/v1/buyer/demands",
        headers=headers,
        json={
            "crop_id": "00000000-0000-0000-0000-000000000000",
            "requested_quantity": "10.000",
            "required_by": "2026-11-30",
        },
    )
    assert missing.status_code == 404

    crop = create_crop(db)
    bad_range = client.post(
        "/api/v1/buyer/demands",
        headers=headers,
        json={
            "crop_id": str(crop.id),
            "requested_quantity": "10.000",
            "target_min_price": "25.00",
            "target_max_price": "15.00",
            "required_by": "2026-11-30",
        },
    )
    assert bad_range.status_code == 422


def test_dashboard_reports_all_sections(client: TestClient, db: Session) -> None:
    buyer = complete_buyer(client, db, phone=BUYER_A)
    headers = buyer["headers"]

    farmer = complete_farmer(client, db, phone="+919000000040")
    created = client.post(
        "/api/v1/farmer/listings",
        headers=farmer["headers"],
        json={
            "farm_id": farmer["farm_id"],
            "crop_id": farmer["crop_id"],
            "title": "Fresh tomatoes",
            "unit": "kg",
            "available_quantity": "200.000",
            "unit_price": "28.00",
        },
    )
    client.put(f"/api/v1/farmer/listings/{created.json()['id']}/publish", headers=farmer["headers"])

    crop = create_crop(db, name="Potato", variety="Local")
    client.post(
        "/api/v1/buyer/demands",
        headers=headers,
        json={
            "crop_id": str(crop.id),
            "requested_quantity": "100.000",
            "required_by": "2026-11-30",
        },
    )

    resp = client.get("/api/v1/buyer/dashboard", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["verification_status"] == "VERIFIED"
    assert body["payment_verification_status"] == "VERIFIED"
    assert body["profile_completion_percent"] == 100
    assert body["marketplace_listings_count"] >= 1
    assert body["recommendations_count"] >= 1
    assert body["demands_count"] == 1
    assert body["orders_count"] == 0
    assert body["payments_count"] == 0
    assert body["deliveries_count"] == 0
    assert body["disputes_count"] == 0
    assert body["reviews_count"] == 0
    assert body["trust_band"] == "NEW"


def test_admin_buyer_queue_verify_and_reject(client: TestClient, db: Session) -> None:
    pending = _basic_buyer(client, db, phone=BUYER_A)
    profile_id = client.get("/api/v1/buyer/profile", headers=pending["headers"]).json()["id"]

    admin = User(
        phone_e164="+919000000150",
        role="ADMIN",
        status="ACTIVE",
        password_hash=hash_password("adminpassword"),
    )
    db.add(admin)
    db.commit()
    admin_token, _ = create_access_token(str(admin.id), admin.role)

    queue = client.get("/api/v1/admin/buyers", headers=bearer(admin_token))
    assert queue.status_code == 200
    assert any(item["business_name"] == "Test Diner" for item in queue.json())

    verify = client.post(f"/api/v1/admin/buyers/{profile_id}/verify", headers=bearer(admin_token))
    assert verify.status_code == 200
    assert verify.json()["verification_status"] == "VERIFIED"

    payment_verify = client.post(
        f"/api/v1/admin/buyers/{profile_id}/payment/verify", headers=bearer(admin_token)
    )
    assert payment_verify.status_code == 200
    assert payment_verify.json()["payment_verification_status"] == "VERIFIED"

    reject = client.post(f"/api/v1/admin/buyers/{profile_id}/reject", headers=bearer(admin_token))
    assert reject.status_code == 200
    assert reject.json()["verification_status"] == "REJECTED"

    denied = client.get("/api/v1/admin/buyers", headers=pending["headers"])
    assert denied.status_code == 403

    missing = client.post(
        "/api/v1/admin/buyers/00000000-0000-0000-0000-000000000000/verify",
        headers=bearer(admin_token),
    )
    assert missing.status_code == 404

    missing_payment = client.post(
        "/api/v1/admin/buyers/00000000-0000-0000-0000-000000000000/payment/reject",
        headers=bearer(admin_token),
    )
    assert missing_payment.status_code == 404


def test_rejected_buyer_can_resubmit_identity(client: TestClient, db: Session) -> None:
    buyer = _basic_buyer(client, db, phone=BUYER_A)
    headers = buyer["headers"]
    profile_id = client.get("/api/v1/buyer/profile", headers=headers).json()["id"]

    admin = User(
        phone_e164="+919000000160",
        role="ADMIN",
        status="ACTIVE",
        password_hash=hash_password("adminpassword"),
    )
    db.add(admin)
    db.commit()
    admin_token, _ = create_access_token(str(admin.id), admin.role)
    client.post(f"/api/v1/admin/buyers/{profile_id}/reject", headers=bearer(admin_token))

    submit = client.post("/api/v1/buyer/verification/identity/submit", headers=headers)
    assert submit.status_code == 200
    assert submit.json()["verification_status"] == "VERIFIED"
