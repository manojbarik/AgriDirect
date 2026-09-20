from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Crop
from app.db.models.people import User
from app.modules.identity.security import create_access_token, hash_password

PHONE = "+919850012345"
PASSWORD = "Abhi@1234"
ADMIN_PHONE = "+916370355406"
ADMIN_EMAIL = "alphacadet009@gmail.com"
ADMIN_PASSWORD = "Abhi@1234"


def admin_user(db: Session, phone: str = ADMIN_PHONE, email: str = ADMIN_EMAIL, password: str = ADMIN_PASSWORD) -> dict[str, Any]:
    """Seed an active admin user and return its bearer headers."""
    admin = db.scalar(select(User).where((User.phone_e164 == phone) | (User.email == email)))
    if admin is None:
        admin = User(phone_e164=phone, email=email, role="ADMIN", status="ACTIVE", password_hash=hash_password(password))
        db.add(admin)
        db.commit()
    token, _ = create_access_token(str(admin.id), admin.role)
    return {"headers": bearer(token), "user_id": str(admin.id)}


def register_user(
    client: TestClient,
    phone: str = PHONE,
    role: str = "FARMER",
    password: str = PASSWORD,
) -> dict:
    resp = client.post(
        "/api/v1/auth/register",
        json={"phone_e164": phone, "role": role, "password": password},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def verify_user(client: TestClient, reg: dict) -> dict:
    resp = client.post(
        "/api/v1/auth/otp/verify",
        json={"challenge_id": reg["challenge_id"], "code": reg["mock_code"]},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_crop(db: Session, name: str = "Tomato", variety: str = "Hybrid") -> Crop:
    crop = Crop(name=name, variety=variety, category="Vegetable", default_unit="kg")
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop


def complete_farmer(
    client: TestClient,
    db: Session,
    phone: str = PHONE,
    verified: bool = True,
    state: str = "Maharashtra",
    district: str = "Nashik",
) -> dict[str, Any]:
    """Register, verify, and finish the full farmer onboarding flow."""
    reg = register_user(client, phone=phone)
    tokens = verify_user(client, reg)["tokens"]
    headers = bearer(tokens["access_token"])

    profile = client.post(
        "/api/v1/farmer/profile",
        headers=headers,
        json={"full_name": "Test Farmer", "preferred_language": "en"},
    )
    assert profile.status_code == 201, profile.text

    farm = client.post(
        "/api/v1/farmer/farms",
        headers=headers,
        json={"name": "Test Green Farm", "acreage": "4.50", "farming_type": "Mixed farming"},
    )
    assert farm.status_code == 201, farm.text
    farm_id = farm.json()["id"]

    location = client.put(
        f"/api/v1/farmer/farms/{farm_id}/location",
        headers=headers,
        json={
            "address_summary": "Test village",
            "state": state,
            "district": district,
            "locality": "Test village",
            "postal_code": "422001",
            "latitude": "19.998",
            "longitude": "73.789",
        },
    )
    assert location.status_code == 200, location.text

    crop = create_crop(db)
    crop_plan = client.post(
        f"/api/v1/farmer/farms/{farm_id}/crops",
        headers=headers,
        json={
            "crop_id": str(crop.id),
            "season": "Kharif 2026",
            "estimated_quantity": "1000.000",
        },
    )
    assert crop_plan.status_code == 201, crop_plan.text

    if verified:
        submit = client.post("/api/v1/farmer/verification/submit", headers=headers)
        assert submit.status_code == 200, submit.text
        assert submit.json()["verification_status"] == "PENDING"
        admin = admin_user(db)
        admin_approve = client.post(
            f"/api/v1/admin/farmers/{profile.json()['id']}/verify",
            headers=admin["headers"],
        )
        assert admin_approve.status_code == 200, admin_approve.text
        assert admin_approve.json()["verification_status"] == "VERIFIED"

    return {
        "headers": headers,
        "profile_id": profile.json()["id"],
        "farm_id": farm_id,
        "crop_id": str(crop.id),
        "crop_plan_id": crop_plan.json()["id"],
    }


def complete_buyer(
    client: TestClient,
    db: Session,
    phone: str = "+919000000002",
    buyer_type: str = "RETAILER",
    verified: bool = True,
) -> dict[str, Any]:
    """Register, verify, and finish the full buyer onboarding flow."""
    reg = register_user(client, phone=phone, role="BUYER")
    tokens = verify_user(client, reg)["tokens"]
    headers = bearer(tokens["access_token"])

    profile = client.post(
        "/api/v1/buyer/profile",
        headers=headers,
        json={
            "full_name": "Test Buyer",
            "buyer_type": buyer_type,
            "business_name": "Test Fresh Stores",
        },
    )
    assert profile.status_code == 201, profile.text

    if verified:
        identity = client.post("/api/v1/buyer/verification/identity/submit", headers=headers)
        assert identity.status_code == 200, identity.text
        assert identity.json()["verification_status"] == "VERIFIED"

    location = client.put(
        "/api/v1/buyer/location",
        headers=headers,
        json={
            "address_summary": "Test market street",
            "state": "Maharashtra",
            "district": "Pune",
            "locality": "Test market",
            "postal_code": "411001",
            "latitude": "18.520",
            "longitude": "73.856",
        },
    )
    assert location.status_code == 200, location.text

    if verified:
        payment = client.post("/api/v1/buyer/verification/payment/submit", headers=headers)
        assert payment.status_code == 200, payment.text
        assert payment.json()["verification_status"] == "VERIFIED"

    return {
        "headers": headers,
        "profile_id": profile.json()["id"],
    }


def complete_bulk_buyer(
    client: TestClient,
    db: Session,
    phone: str = "+919000000006",
    org_type: str = "FPO",
) -> dict[str, Any]:
    """Register, verify, and build an FPO/enterprise bulk buyer.

    The BulkBuyerProfile is auto-created at registration with a placeholder
    name; this helper upgrades it to a fully-formed organization profile and
    links a BuyerProfile (required for transactional order paths).
    """
    reg = register_user(client, phone=phone, role="BULK_BUYER")
    tokens = verify_user(client, reg)["tokens"]
    headers = bearer(tokens["access_token"])

    org = client.put(
        "/api/v1/bulk-buyer/profile",
        headers=headers,
        json={
            "organization_name": "Green Valley FPO",
            "org_type": org_type,
            "gstin": "27AADCB2230M1Z5",
            "contact_person": "Coordinator",
        },
    )
    assert org.status_code == 200, org.text

    buyer = client.post(
        "/api/v1/buyer/profile",
        headers=headers,
        json={
            "full_name": "Green Valley FPO",
            "buyer_type": "WHOLESALER",
            "business_name": "Green Valley FPO",
        },
    )
    assert buyer.status_code == 201, buyer.text

    return {
        "headers": headers,
        "profile_id": org.json()["id"],
        "buyer_profile_id": buyer.json()["id"],
    }


def complete_logistics(
    client: TestClient,
    phone: str = "+919000000003",
) -> dict[str, Any]:
    """Register and verify a logistics partner (profile auto-created)."""
    reg = register_user(client, phone=phone, role="LOGISTICS")
    tokens = verify_user(client, reg)["tokens"]
    return {"headers": bearer(tokens["access_token"])}


def complete_consumer(
    client: TestClient,
    db: Session,
    phone: str = "+919000000004",
) -> dict[str, Any]:
    """Register and verify a consumer (ConsumerProfile is auto-created at registration)."""
    reg = register_user(client, phone=phone, role="CONSUMER")
    tokens = verify_user(client, reg)["tokens"]
    headers = bearer(tokens["access_token"])
    return {"headers": headers, "phone": phone}


def create_published_listing(
    client: TestClient,
    db: Session,
    farmer_data: dict[str, Any],
    *,
    crop_id: str | None = None,
    title: str = "Fresh tomatoes",
    unit_price: str = "25.00",
    available_quantity: str = "500.000",
    state: str = "Maharashtra",
    district: str = "Nashik",
) -> dict[str, Any]:
    """Create and publish a listing on behalf of a completed farmer."""
    crop_id = crop_id or farmer_data["crop_id"]
    listing = client.post(
        "/api/v1/farmer/listings",
        headers=farmer_data["headers"],
        json={
            "farm_id": farmer_data["farm_id"],
            "crop_id": crop_id,
            "title": title,
            "grade": "Grade A",
            "unit": "kg",
            "available_quantity": available_quantity,
            "unit_price": unit_price,
            "available_from": "2026-09-20",
            "available_until": "2026-10-10",
        },
    )
    assert listing.status_code == 201, listing.text
    published = client.put(
        f"/api/v1/farmer/listings/{listing.json()['id']}/publish",
        headers=farmer_data["headers"],
    )
    assert published.status_code == 200, published.text
    return published.json()
