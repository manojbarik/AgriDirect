import uuid
from datetime import date
from decimal import Decimal

from app.db.models.marketplace import Order
from tests.helpers import (
    complete_buyer,
    complete_farmer,
    create_published_listing,
    register_user,
    verify_user,
)


def _auth(headers: dict) -> dict:
    return headers


def _tokens(client, phone: str, role: str = "FARMER") -> dict:
    reg = register_user(client, phone=phone, role=role)
    tokens = verify_user(client, reg)["tokens"]
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def _farmer(db, client):
    data = complete_farmer(client, db)
    return data, data["headers"]


def _buyer(db, client):
    data = complete_buyer(client, db)
    return data, data["headers"]


def _completed_order(client, db, farmer, buyer):
    order = Order(
        public_order_number=f"ORD-T{uuid.uuid4().hex[:8].upper()}",
        farmer_id=uuid.UUID(farmer["profile_id"]),
        buyer_id=uuid.UUID(buyer["profile_id"]),
        source_type="NEGOTIATION",
        status="COMPLETED",
        total_amount=Decimal("100.00"),
        currency="INR",
        unit="kg",
        requested_quantity=Decimal("10.000"),
        requested_price=Decimal("10.00"),
        expected_delivery_date=date(2026, 10, 1),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def test_registration_and_verification_events(client, db):
    headers = _tokens(client, "+919000000110")

    listing = client.get("/api/v1/notifications", headers=headers)
    assert listing.status_code == 200, listing.text
    types = {n["notification_type"] for n in listing.json()}
    assert "registration" in types
    assert "verification" in types


def test_new_buyer_demand_emitted_to_matching_farmers(client, db):
    farmer, _ = _farmer(db, client)
    buyer, buyer_headers = _buyer(db, client)
    create_published_listing(client, db, farmer)

    demand = client.post(
        "/api/v1/buyer/demands",
        headers=buyer_headers,
        json={
            "crop_id": farmer["crop_id"],
            "title": "Need tomatoes",
            "requested_quantity": "100.000",
            "unit": "kg",
            "state": "Maharashtra",
            "district": "Nashik",
            "required_by": "2026-10-10",
        },
    )
    assert demand.status_code == 201, demand.text

    notifications = client.get("/api/v1/notifications", headers=farmer["headers"])
    assert notifications.status_code == 200, notifications.text
    assert any(
        n["notification_type"] == "new_buyer_demand"
        for n in notifications.json()
    )


def test_order_request_emitted_to_farmer(client, db):
    farmer, _ = _farmer(db, client)
    buyer, buyer_headers = _buyer(db, client)
    listing = create_published_listing(client, db, farmer)

    order = client.post(
        "/api/v1/orders",
        headers=buyer_headers,
        json={"listing_id": listing["id"], "quantity": "20.000", "price": "25.00", "delivery_date": "2026-10-05"},
    )
    assert order.status_code == 201, order.text

    notifications = client.get("/api/v1/notifications", headers=farmer["headers"])
    assert any(
        n["notification_type"] == "order_request"
        for n in notifications.json()
    )


def test_new_review_emitted_to_reviewee(client, db):
    farmer, _ = _farmer(db, client)
    buyer, buyer_headers = _buyer(db, client)
    order = _completed_order(client, db, farmer, buyer)

    client.post(
        "/api/v1/ratings",
        headers=buyer_headers,
        json={"order_id": str(order.id), "rating": 5, "comment": "Great"},
    )

    notifications = client.get("/api/v1/notifications", headers=farmer["headers"])
    assert any(
        n["notification_type"] == "new_review"
        for n in notifications.json()
    )


def test_mark_read_and_unread_count(client, db):
    headers = _tokens(client, "+919000000111")

    listing = client.get("/api/v1/notifications", headers=headers)
    items = listing.json()
    assert items, "expected at least the registration notification"

    count_before = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert count_before.status_code == 200
    assert int(count_before.json()["unread_count"]) == len(items)

    target = items[0]["id"]
    marked = client.post(f"/api/v1/notifications/{target}/read", headers=headers)
    assert marked.status_code == 200, marked.text
    assert marked.json()["read_at"] is not None

    count_after = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert int(count_after.json()["unread_count"]) == len(items) - 1

    all_read = client.post("/api/v1/notifications/read-all", headers=headers)
    assert all_read.status_code == 200
    final = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert int(final.json()["unread_count"]) == 0


def test_notifications_require_auth(client, db):
    resp = client.get("/api/v1/notifications")
    assert resp.status_code in (401, 403)