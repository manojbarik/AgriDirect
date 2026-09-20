import uuid
from datetime import date
from decimal import Decimal

from app.db.models.marketplace import BuyerDemand, Delivery, Order
from app.db.models.people import BuyerProfile, FarmerProfile
from app.db.models.social import Rating
from app.db.models.transaction import Dispute, Payment
from tests.helpers import (
    admin_user,
    complete_buyer,
    complete_farmer,
    create_published_listing,
    register_user,
    verify_user,
)


def _user_id(db, profile_id: str) -> uuid.UUID:
    return db.get(FarmerProfile, uuid.UUID(profile_id)).user_id


def _buyer_id(db, profile_id: str) -> uuid.UUID:
    return db.get(BuyerProfile, uuid.UUID(profile_id)).user_id


def _make_paid_order(db, farmer_profile_id: str, buyer_profile_id: str, payer_user_id: uuid.UUID, amount: str = "500.00", crop_id: uuid.UUID | None = None):
    order = Order(
        public_order_number=f"ORD-ADM{uuid.uuid4().hex[:8].upper()}",
        farmer_id=uuid.UUID(farmer_profile_id),
        buyer_id=uuid.UUID(buyer_profile_id),
        crop_id=crop_id,
        source_type="DIRECT_PURCHASE",
        status="COMPLETED",
        total_amount=Decimal(amount),
        currency="INR",
        unit="kg",
        requested_quantity=Decimal("50.000"),
        requested_price=Decimal("10.00"),
        expected_delivery_date=date(2026, 10, 1),
    )
    db.add(order)
    db.flush()
    payment = Payment(
        order_id=order.id,
        payer_id=payer_user_id,
        operation="BALANCE",
        amount=Decimal(amount),
        currency="INR",
        status="PAID",
        idempotency_key=f"adm-{uuid.uuid4().hex}",
    )
    db.add(payment)
    db.commit()
    return order


def _make_dispute(db, order, user_id: uuid.UUID):
    dispute = Dispute(
        order_id=order.id,
        opened_by_id=user_id,
        category="QUALITY",
        description="Not as expected",
        requested_resolution="REFUND",
        status="OPEN",
    )
    db.add(dispute)
    db.commit()
    return dispute


def _admin_auth(db):
    return admin_user(db)["headers"]


def test_dashboard_requires_admin(client, db):
    headers = _admin_auth(db)
    reg = register_user(client, phone="+919000100101", role="BUYER")
    buyer_token = verify_user(client, reg)["tokens"]["access_token"]

    for path in (
        "/api/v1/admin/dashboard",
        "/api/v1/admin/users",
        "/api/v1/admin/orders",
        "/api/v1/admin/ai-predictions",
        "/api/v1/admin/verification-requests",
    ):
        assert client.get(path, headers=headers).status_code == 200

    for path in ("/api/v1/admin/dashboard", "/api/v1/admin/users"):
        resp = client.get(path, headers={"Authorization": f"Bearer {buyer_token}"})
        assert resp.status_code == 403
    assert client.get("/api/v1/admin/dashboard").status_code in (401, 403)


def test_dashboard_statistics_and_charts(client, db):
    headers = _admin_auth(db)

    farmer = complete_farmer(client, db, phone="+919000100201")
    buyer = complete_buyer(client, db, phone="+919000100202")
    create_published_listing(
        client, db, farmer, available_quantity="100.000", unit_price="30.00"
    )
    order = _make_paid_order(
        db,
        farmer["profile_id"],
        buyer["profile_id"],
        _user_id(db, farmer["profile_id"]),
        amount="500.00",
        crop_id=uuid.UUID(farmer["crop_id"]),
    )
    _make_dispute(db, order, _buyer_id(db, buyer["profile_id"]))
    db.add(
        Rating(
            order_id=order.id,
            rater_id=_buyer_id(db, buyer["profile_id"]),
            rated_user_id=_user_id(db, farmer["profile_id"]),
            score=5,
        )
    )
    db.commit()

    resp = client.get("/api/v1/admin/dashboard", headers=headers)
    assert resp.status_code == 200, resp.text
    payload = resp.json()

    stats = payload["statistics"]
    assert stats["farmers"] >= 1
    assert stats["buyers"] >= 1
    assert stats["listings"] >= 1
    assert stats["active_listings"] >= 1
    assert stats["orders"] >= 1
    assert stats["completed_orders"] >= 1
    assert stats["active_disputes"] >= 1
    assert stats["reviews"] >= 1
    assert stats["transaction_volume"] >= 500.0

    charts = payload["charts"]
    for key in (
        "registered_farmers",
        "registered_buyers",
        "active_listings",
        "orders",
        "completed_orders",
        "disputes",
        "transaction_volume",
        "ai_predictions",
        "crop_demand",
    ):
        assert key in charts, key
    assert len(charts["orders"]) == 30
    assert sum(point["value"] for point in charts["orders"]) >= 1
    assert sum(point["value"] for point in charts["disputes"]) >= 1


def test_dashboard_list_endpoints_are_sanitized(client, db):
    headers = _admin_auth(db)

    farmer = complete_farmer(client, db, phone="+919000100301")
    buyer = complete_buyer(client, db, phone="+919000100302")
    create_published_listing(
        client, db, farmer, available_quantity="80.000", unit_price="25.00"
    )
    order = _make_paid_order(
        db,
        farmer["profile_id"],
        buyer["profile_id"],
        _user_id(db, farmer["profile_id"]),
        amount="200.00",
        crop_id=uuid.UUID(farmer["crop_id"]),
    )
    db.add(
        BuyerDemand(
            buyer_id=uuid.UUID(buyer["profile_id"]),
            crop_id=uuid.UUID(farmer["crop_id"]),
            requested_quantity=Decimal("40.000"),
            unit="kg",
            currency="INR",
            state="Maharashtra",
            district="Pune",
            required_by=date(2026, 11, 1),
            status="DRAFT",
        )
    )
    db.add(Delivery(order_id=order.id, status="READY_FOR_PICKUP"))
    db.commit()

    users = client.get("/api/v1/admin/users", headers=headers).json()
    assert len(users) >= 3  # admin + farmer + buyer
    assert "password_hash" not in users[0]
    assert "otp" not in str(users[0]).lower()

    assert client.get("/api/v1/admin/farmers", headers=headers).status_code == 200
    assert client.get("/api/v1/admin/buyers", headers=headers).status_code == 200
    assert client.get("/api/v1/admin/listings", headers=headers).status_code == 200
    demands = client.get("/api/v1/admin/demands", headers=headers).json()
    assert len(demands) >= 1
    assert demands[0]["crop"]
    orders = client.get("/api/v1/admin/orders", headers=headers).json()
    assert len(orders) >= 1
    assert orders[0]["order_number"].startswith("ORD-")
    payments = client.get("/api/v1/admin/payments", headers=headers).json()
    assert payments[0]["amount"] == 200.0
    assert client.get("/api/v1/admin/deliveries", headers=headers).status_code == 200
    assert client.get("/api/v1/admin/quality-checks", headers=headers).status_code == 200
    assert client.get("/api/v1/admin/refunds", headers=headers).status_code == 200
    assert client.get("/api/v1/admin/reviews", headers=headers).status_code == 200
    assert client.get("/api/v1/admin/ai-predictions", headers=headers).status_code == 200

    requests = client.get("/api/v1/admin/verification-requests", headers=headers).json()
    assert "farmers" in requests and "buyers" in requests


def test_ai_predictions_are_recorded(client, db):
    headers = _admin_auth(db)
    assert client.get("/api/v1/admin/ai-predictions", headers=headers).json() == []

    payload = {
        "crop_name": "Tomato",
        "variety": "Hybrid",
        "category": "Vegetable",
        "state": "Maharashtra",
        "district": "Pune",
        "season": "Kharif",
        "month": 10,
        "quantity_kg": "1000",
        "demand_index": "1.2",
    }
    resp = client.post("/api/v1/ai/price-prediction", json=payload)
    assert resp.status_code == 200, resp.text

    records = client.get("/api/v1/admin/ai-predictions", headers=headers).json()
    assert len(records) == 1
    assert records[0]["prediction_type"] == "price_prediction"
    assert records[0]["location"] == "Pune, Maharashtra"