import uuid
from datetime import date
from decimal import Decimal
from uuid import uuid4

from app.db.models.marketplace import Order
from app.db.models.people import BuyerProfile, FarmerProfile
from tests.helpers import complete_buyer, complete_farmer, register_user, verify_user


def _farmer(db, client):
    data = complete_farmer(client, db)
    return db.get(FarmerProfile, uuid.UUID(data["profile_id"])), data["headers"]


def _buyer(db, client):
    data = complete_buyer(client, db)
    return db.get(BuyerProfile, uuid.UUID(data["profile_id"])), data["headers"]


def _order(db, farmer, buyer, *, status="COMPLETED"):
    order = Order(
        public_order_number=f"ORD-T{uuid4().hex[:8].upper()}",
        farmer_id=farmer.id,
        buyer_id=buyer.id,
        source_type="NEGOTIATION",
        status=status,
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


def test_buyer_rates_farmer_and_trust_score_updates(client, db):
    farmer, farmer_headers = _farmer(db, client)
    buyer, buyer_headers = _buyer(db, client)
    order = _order(db, farmer, buyer)

    resp = client.post(
        "/api/v1/ratings",
        headers=buyer_headers,
        json={"order_id": str(order.id), "rating": 5, "comment": "Great produce"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["rating"] == 5
    assert data["comment"] == "Great produce"
    assert data["reviewer_role"] == "BUYER"
    assert data["reviewee_id"] == str(farmer.user_id)

    duplicate = client.post(
        "/api/v1/ratings",
        headers=buyer_headers,
        json={"order_id": str(order.id), "rating": 3},
    )
    assert duplicate.status_code == 409

    trust = client.get("/api/v1/trust-score/me", headers=farmer_headers)
    assert trust.status_code == 200, trust.text
    assert trust.json()["score"] == "63.00"


def test_farmer_rates_buyer(client, db):
    farmer, farmer_headers = _farmer(db, client)
    buyer, _ = _buyer(db, client)
    order = _order(db, farmer, buyer)

    resp = client.post(
        "/api/v1/ratings",
        headers=farmer_headers,
        json={"order_id": str(order.id), "rating": 4, "comment": "Prompt buyer"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["reviewer_role"] == "FARMER"
    assert resp.json()["reviewee_id"] == str(buyer.user_id)


def test_ratings_require_completed_orders(client, db):
    farmer, farmer_headers = _farmer(db, client)
    buyer, _ = _buyer(db, client)
    order = _order(db, farmer, buyer, status="DELIVERED")

    resp = client.post(
        "/api/v1/ratings",
        headers=farmer_headers,
        json={"order_id": str(order.id), "rating": 4},
    )
    assert resp.status_code == 409
    assert "completed" in resp.json()["detail"]


def test_only_order_parties_can_rate(client, db):
    farmer, _ = _farmer(db, client)
    buyer, buyer_headers = _buyer(db, client)
    order = _order(db, farmer, buyer)

    stranger = register_user(client, phone="+919000000040", role="BUYER")
    stranger_headers = {
        "Authorization": f"Bearer {verify_user(client, stranger)['tokens']['access_token']}"
    }
    resp = client.post(
        "/api/v1/ratings",
        headers=stranger_headers,
        json={"order_id": str(order.id), "rating": 5},
    )
    assert resp.status_code == 403


def test_order_rating_state(client, db):
    farmer, _ = _farmer(db, client)
    buyer, buyer_headers = _buyer(db, client)
    order = _order(db, farmer, buyer)

    blank = client.get(f"/api/v1/ratings/orders/{order.id}", headers=buyer_headers)
    assert blank.status_code == 200
    assert blank.json()["can_rate"] is True
    assert blank.json()["my_rating"] is None

    client.post(
        "/api/v1/ratings",
        headers=buyer_headers,
        json={"order_id": str(order.id), "rating": 5, "comment": "Great"},
    )
    after = client.get(f"/api/v1/ratings/orders/{order.id}", headers=buyer_headers)
    assert after.status_code == 200
    assert after.json()["can_rate"] is False
    assert after.json()["my_rating"]["rating"] == 5


def test_user_rating_summary(client, db):
    farmer, farmer_headers = _farmer(db, client)
    buyer, buyer_headers = _buyer(db, client)
    order = _order(db, farmer, buyer)
    client.post(
        "/api/v1/ratings",
        headers=buyer_headers,
        json={"order_id": str(order.id), "rating": 4, "comment": "Good"},
    )

    summary = client.get(f"/api/v1/ratings/users/{farmer.user_id}")
    assert summary.status_code == 200, summary.text
    data = summary.json()
    assert data["rating_count"] == 1
    assert float(data["average_rating"]) == 4.0
    assert data["history"][0]["comment"] == "Good"