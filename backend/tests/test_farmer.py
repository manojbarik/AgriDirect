from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.modules.identity.security import create_access_token, hash_password
from tests.helpers import (
    admin_user,
    bearer,
    complete_farmer,
    create_crop,
    register_user,
    verify_user,
)

FARMER_A = "+919000000020"
FARMER_B = "+919000000021"


def _profile_only_farmer(client: TestClient, db: Session, phone: str = FARMER_B) -> dict:
    reg = register_user(client, phone=phone)
    tokens = verify_user(client, reg)["tokens"]
    headers = bearer(tokens["access_token"])
    resp = client.post(
        "/api/v1/farmer/profile",
        headers=headers,
        json={"full_name": "Lonely Farmer"},
    )
    assert resp.status_code == 201
    return {"headers": headers}


def test_farmer_endpoints_require_roles(client: TestClient, db: Session) -> None:
    reg = register_user(client, role="BUYER")
    buyer_token = verify_user(client, reg)["tokens"]["access_token"]
    assert client.get("/api/v1/farmer/profile", headers=bearer(buyer_token)).status_code == 403
    assert client.get("/api/v1/farmer/profile").status_code == 401


def test_create_get_update_profile(client: TestClient, db: Session) -> None:
    reg = register_user(client)
    headers = bearer(verify_user(client, reg)["tokens"]["access_token"])

    created = client.post(
        "/api/v1/farmer/profile",
        headers=headers,
        json={"full_name": "Rohan Patel", "preferred_language": "hi"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["full_name"] == "Rohan Patel"
    assert body["verification_status"] == "PENDING"

    fetched = client.get("/api/v1/farmer/profile", headers=headers)
    assert fetched.status_code == 200

    updated = client.put(
        "/api/v1/farmer/profile",
        headers=headers,
        json={"full_name": "Rohan K Patel", "preferred_language": "en"},
    )
    assert updated.status_code == 200
    assert updated.json()["full_name"] == "Rohan K Patel"


def test_create_profile_conflict(client: TestClient, db: Session) -> None:
    reg = register_user(client)
    headers = bearer(verify_user(client, reg)["tokens"]["access_token"])
    payload = {"full_name": "Rohan Patel"}
    assert client.post("/api/v1/farmer/profile", headers=headers, json=payload).status_code == 201
    assert client.post("/api/v1/farmer/profile", headers=headers, json=payload).status_code == 409


def test_farms_require_profile(client: TestClient, db: Session) -> None:
    reg = register_user(client)
    headers = bearer(verify_user(client, reg)["tokens"]["access_token"])
    resp = client.post("/api/v1/farmer/farms", headers=headers, json={"name": "No Profile Farm"})
    assert resp.status_code == 404


def test_farm_crud_and_location(client: TestClient, db: Session) -> None:
    farmer = complete_farmer(client, db, phone=FARMER_A)
    headers = farmer["headers"]

    fetched = client.get(f"/api/v1/farmer/farms/{farmer['farm_id']}", headers=headers)
    assert fetched.status_code == 200
    body = fetched.json()
    assert body["name"] == "Test Green Farm"
    assert body["state"] == "Maharashtra"
    assert body["district"] == "Nashik"
    assert float(body["latitude"]) == 19.998

    listed = client.get("/api/v1/farmer/farms", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    updated = client.put(
        f"/api/v1/farmer/farms/{farmer['farm_id']}",
        headers=headers,
        json={"name": "Renamed Farm", "acreage": "6.00"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Renamed Farm"

    location = client.put(
        f"/api/v1/farmer/farms/{farmer['farm_id']}/location",
        headers=headers,
        json={"state": "Karnataka", "district": "Bengaluru Rural", "postal_code": "562110"},
    )
    assert location.status_code == 200
    assert location.json()["state"] == "Karnataka"
    assert location.json()["locality"] == "Test village"


def test_farm_ownership_is_enforced(client: TestClient, db: Session) -> None:
    a = complete_farmer(client, db, phone=FARMER_A)
    b = complete_farmer(client, db, phone=FARMER_B)
    resp = client.get(f"/api/v1/farmer/farms/{a['farm_id']}", headers=b["headers"])
    assert resp.status_code == 404


def test_crop_plan_lifecycle(client: TestClient, db: Session) -> None:
    farmer = complete_farmer(client, db, phone=FARMER_A)
    headers = farmer["headers"]

    farm_crops = client.get(f"/api/v1/farmer/farms/{farmer['farm_id']}/crops", headers=headers)
    assert farm_crops.status_code == 200
    assert len(farm_crops.json()) == 1

    all_crops = client.get("/api/v1/farmer/crops", headers=headers)
    assert all_crops.status_code == 200
    assert all_crops.json()[0]["crop_name"] == "Tomato"

    removed = client.delete(
        f"/api/v1/farmer/farms/{farmer['farm_id']}/crops/{farmer['crop_plan_id']}",
        headers=headers,
    )
    assert removed.status_code == 204
    assert (
        client.get(f"/api/v1/farmer/farms/{farmer['farm_id']}/crops", headers=headers).json() == []
    )


def test_crop_plan_rejects_unknown_crop(client: TestClient, db: Session) -> None:
    farmer = complete_farmer(client, db, phone=FARMER_A)
    headers = farmer["headers"]
    resp = client.post(
        f"/api/v1/farmer/farms/{farmer['farm_id']}/crops",
        headers=headers,
        json={"crop_id": "00000000-0000-0000-0000-000000000000", "season": "Kharif"},
    )
    assert resp.status_code == 404


def test_crop_plan_rejects_invalid_harvest_window(client: TestClient, db: Session) -> None:
    farmer = complete_farmer(client, db, phone=FARMER_A)
    headers = farmer["headers"]
    resp = client.post(
        f"/api/v1/farmer/farms/{farmer['farm_id']}/crops",
        headers=headers,
        json={
            "crop_id": farmer["crop_id"],
            "expected_harvest_start": "2026-10-01",
            "expected_harvest_end": "2026-09-01",
        },
    )
    assert resp.status_code == 422


def test_crop_catalog_is_public(client: TestClient, db: Session) -> None:
    create_crop(db, name="Tomato", variety="Hybrid")
    create_crop(db, name="Onion", variety="Red")
    resp = client.get("/api/v1/marketplace/crops")
    assert resp.status_code == 200
    names = [crop["name"] for crop in resp.json()]
    assert "Onion" in names
    assert "Tomato" in names


def test_verification_pending_when_incomplete(client: TestClient, db: Session) -> None:
    farmer = _profile_only_farmer(client, db)
    headers = farmer["headers"]
    resp = client.post("/api/v1/farmer/verification/submit", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["verification_status"] == "PENDING"
    assert "farm" in body["reason"]


def test_status_reports_onboarding_progress(client: TestClient, db: Session) -> None:
    farmer = _profile_only_farmer(client, db)
    headers = farmer["headers"]
    resp = client.get("/api/v1/farmer/status", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["verification_status"] == "PENDING"
    assert body["completion_percent"] == 25
    assert body["can_submit"] is False
    done_keys = {step["key"] for step in body["steps"] if step["done"]}
    assert done_keys == {"profile"}


def test_listing_lifecycle_requires_verification_to_publish(
    client: TestClient, db: Session
) -> None:
    farmer = complete_farmer(client, db, phone=FARMER_A, verified=False)
    headers = farmer["headers"]

    created = client.post(
        "/api/v1/farmer/listings",
        headers=headers,
        json={
            "farm_id": farmer["farm_id"],
            "crop_id": farmer["crop_id"],
            "title": "Fresh tomatoes",
            "unit": "kg",
            "available_quantity": "500.000",
            "unit_price": "25.00",
            "currency": "INR",
        },
    )
    assert created.status_code == 201
    listing_id = created.json()["id"]
    assert created.json()["status"] == "DRAFT"
    assert created.json()["state"] == "Maharashtra"

    submit = client.post("/api/v1/farmer/verification/submit", headers=headers)
    assert submit.json()["verification_status"] == "PENDING"

    admin = admin_user(db)
    approved = client.post(
        f"/api/v1/admin/farmers/{farmer['profile_id']}/verify",
        headers=admin["headers"],
    )
    assert approved.status_code == 200
    assert approved.json()["verification_status"] == "VERIFIED"

    published = client.put(f"/api/v1/farmer/listings/{listing_id}/publish", headers=headers)
    assert published.status_code == 200
    assert published.json()["status"] == "PUBLISHED"
    assert published.json()["published_at"] is not None

    paused = client.put(f"/api/v1/farmer/listings/{listing_id}/pause", headers=headers)
    assert paused.status_code == 200
    assert paused.json()["status"] == "PAUSED"

    cancelled = client.put(f"/api/v1/farmer/listings/{listing_id}/cancel", headers=headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"

    listed = client.get("/api/v1/farmer/listings", headers=headers)
    assert listed.status_code == 200
    assert listed.json()[0]["status"] == "CANCELLED"


def test_listing_ownership_is_enforced(client: TestClient, db: Session) -> None:
    a = complete_farmer(client, db, phone=FARMER_A)
    b = complete_farmer(client, db, phone=FARMER_B)
    created = client.post(
        "/api/v1/farmer/listings",
        headers=a["headers"],
        json={
            "farm_id": a["farm_id"],
            "crop_id": a["crop_id"],
            "title": "A's tomatoes",
            "unit": "kg",
            "available_quantity": "100.000",
            "unit_price": "20.00",
        },
    )
    listing_id = created.json()["id"]
    resp = client.get(f"/api/v1/farmer/listings/{listing_id}", headers=b["headers"])
    assert resp.status_code == 404


def test_dashboard_reports_all_statistics(client: TestClient, db: Session) -> None:
    farmer = complete_farmer(client, db, phone=FARMER_A)
    headers = farmer["headers"]
    created = client.post(
        "/api/v1/farmer/listings",
        headers=headers,
        json={
            "farm_id": farmer["farm_id"],
            "crop_id": farmer["crop_id"],
            "title": "Fresh tomatoes",
            "unit": "kg",
            "available_quantity": "300.000",
            "unit_price": "30.00",
        },
    )
    client.put(f"/api/v1/farmer/listings/{created.json()['id']}/publish", headers=headers)

    resp = client.get("/api/v1/farmer/dashboard", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["profile_completion_percent"] == 100
    assert body["verification_status"] == "VERIFIED"
    assert body["farms_count"] == 1
    assert body["crops_count"] == 1
    assert body["active_listings_count"] == 1
    assert body["orders_count"] == 0
    assert body["batches_count"] == 0
    assert float(body["earnings"]) == 0
    assert body["trust_band"] == "NEW"


def test_admin_farmer_queue_verify_and_reject(client: TestClient, db: Session) -> None:
    pending = _profile_only_farmer(client, db, phone=FARMER_A)
    profile_id = client.get("/api/v1/farmer/profile", headers=pending["headers"]).json()["id"]

    buyer_reg = register_user(client, phone="+919000000105", role="BUYER")
    buyer_token = verify_user(client, buyer_reg)["tokens"]["access_token"]

    admin = User(
        phone_e164="+919000000110",
        role="ADMIN",
        status="ACTIVE",
        password_hash=hash_password("adminpassword"),
    )
    db.add(admin)
    db.commit()
    admin_token, _ = create_access_token(str(admin.id), admin.role)

    queue = client.get("/api/v1/admin/farmers", headers=bearer(admin_token))
    assert queue.status_code == 200
    assert any(item["verification_status"] == "PENDING" for item in queue.json())

    verify = client.post(f"/api/v1/admin/farmers/{profile_id}/verify", headers=bearer(admin_token))
    assert verify.status_code == 200
    assert verify.json()["verification_status"] == "VERIFIED"

    reject = client.post(f"/api/v1/admin/farmers/{profile_id}/reject", headers=bearer(admin_token))
    assert reject.status_code == 200
    assert reject.json()["verification_status"] == "REJECTED"

    denied = client.get("/api/v1/admin/farmers", headers=bearer(buyer_token))
    assert denied.status_code == 403

    missing = client.post(
        "/api/v1/admin/farmers/00000000-0000-0000-0000-000000000000/verify",
        headers=bearer(admin_token),
    )
    assert missing.status_code == 404


def test_rejected_farmer_can_resubmit_for_verification(client: TestClient, db: Session) -> None:
    pending = _profile_only_farmer(client, db, phone=FARMER_A)
    headers = pending["headers"]
    profile_id = client.get("/api/v1/farmer/profile", headers=headers).json()["id"]

    admin = User(
        phone_e164="+919000000120",
        role="ADMIN",
        status="ACTIVE",
        password_hash=hash_password("adminpassword"),
    )
    db.add(admin)
    db.commit()
    admin_token, _ = create_access_token(str(admin.id), admin.role)
    client.post(f"/api/v1/admin/farmers/{profile_id}/reject", headers=bearer(admin_token))

    submit = client.post("/api/v1/farmer/verification/submit", headers=headers)
    assert submit.status_code == 200
    assert submit.json()["verification_status"] == "PENDING"
