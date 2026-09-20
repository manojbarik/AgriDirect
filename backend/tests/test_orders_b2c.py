"""B2C (consumer) order flow tests.

Consumers are personal buyers: their orders never use escrow/contracts and are
paid in a single full payment once the farmer accepts. The B2B path (buyer_id
set, order_type=B2B, escrow) is unchanged and covered by test_orders.py.
"""

from uuid import UUID

from sqlalchemy import select

from app.db.models.transaction import EscrowAccount, Settlement
from tests.helpers import (
    complete_buyer,
    complete_consumer,
    complete_farmer,
    create_published_listing,
)

DELIVERY_DATE = "2026-10-05"


def _consumer_order(client, consumer, listing, quantity="10", price="25.00"):
    return client.post(
        "/api/v1/orders",
        headers=consumer["headers"],
        json={
            "listing_id": listing["id"],
            "quantity": quantity,
            "unit": "kg",
            "price": price,
            "delivery_date": DELIVERY_DATE,
            "note": "Home delivery please.",
            "delivery_address_summary": "House 4, Green Lane, Near City Park",
        },
    )


def test_consumer_creates_b2c_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    consumer = complete_consumer(client, db)

    resp = _consumer_order(client, consumer, listing)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["order_type"] == "B2C"
    assert data["my_role"] == "CONSUMER"
    assert data["buyer_id"] is None
    assert data["consumer_id"] is not None
    assert data["total_amount"] == "250.00"
    assert data["farmer_name"] == "Test Farmer"
    assert data["buyer_name"] == consumer["phone"]
    assert data["pending_offer_by_role"] == "CONSUMER"
    assert data["next_allowed_actions"] == ["cancel"]
    assert data["negotiation_messages"][0]["from_role"] == "CONSUMER"
    assert data["status_events"][0]["changed_by_role"] == "CONSUMER"


def test_consumer_order_quantity_capped(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    consumer = complete_consumer(client, db)

    resp = _consumer_order(client, consumer, listing, quantity="100")
    assert resp.status_code == 400
    assert "limited to 25" in resp.json()["detail"]


def test_buyer_creates_b2b_order_still(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)

    resp = client.post(
        "/api/v1/orders",
        headers=buyer["headers"],
        json={
            "listing_id": listing["id"],
            "quantity": "100",
            "unit": "kg",
            "price": "25.00",
            "delivery_date": DELIVERY_DATE,
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["order_type"] == "B2B"
    assert data["buyer_id"] is not None
    assert data["consumer_id"] is None
    assert data["my_role"] == "BUYER"


def test_consumer_lists_and_reads_own_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    consumer = complete_consumer(client, db)
    order = _consumer_order(client, consumer, listing).json()

    listed = client.get("/api/v1/orders", headers=consumer["headers"])
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["id"] == order["id"]
    assert listed.json()[0]["my_role"] == "CONSUMER"

    detail = client.get(f"/api/v1/orders/{order['id']}", headers=consumer["headers"])
    assert detail.status_code == 200
    assert detail.json()["order_type"] == "B2C"


def test_buyer_role_cannot_see_consumer_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    consumer = complete_consumer(client, db)
    order = _consumer_order(client, consumer, listing).json()

    buyer = complete_buyer(client, db, phone="+919000000006")
    resp = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"])
    assert resp.status_code == 404

    listed = client.get("/api/v1/orders", headers=buyer["headers"])
    assert listed.status_code == 200
    assert len(listed.json()) == 0


def test_consumer_full_payment_no_escrow(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    consumer = complete_consumer(client, db)
    order_id = _consumer_order(client, consumer, listing).json()["id"]

    client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])

    intent = client.post(
        "/api/v1/payments/intents",
        headers=consumer["headers"],
        json={"order_id": order_id, "operation": "BALANCE"},
    )
    assert intent.status_code in (200, 201), intent.text
    payment_id = intent.json()["id"]

    confirmed = client.post(
        f"/api/v1/payments/{payment_id}/confirm", headers=consumer["headers"]
    )
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["status"] == "SETTLED"

    order = client.get(f"/api/v1/orders/{order_id}", headers=consumer["headers"]).json()
    assert order["status"] == "CONFIRMED"

    settlement = client.get(
        f"/api/v1/payments/orders/{order_id}/settlement", headers=consumer["headers"]
    )
    assert settlement.status_code == 200, settlement.text
    assert settlement.json()["status"] == "RELEASED"

    escrow = db.scalar(select(EscrowAccount).where(EscrowAccount.order_id == UUID(order_id)))
    assert escrow is None
    settlement_row = db.scalar(select(Settlement).where(Settlement.order_id == UUID(order_id)))
    assert settlement_row is not None


def test_consumer_advance_payment_rejected(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    consumer = complete_consumer(client, db)
    order_id = _consumer_order(client, consumer, listing).json()["id"]

    client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])
    resp = client.post(
        "/api/v1/payments/intents",
        headers=consumer["headers"],
        json={"order_id": order_id, "operation": "ADVANCE"},
    )
    assert resp.status_code == 400


def test_consumer_rides_order_to_completion(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    consumer = complete_consumer(client, db)
    order_id = _consumer_order(client, consumer, listing).json()["id"]

    client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])
    intent = client.post(
        "/api/v1/payments/intents",
        headers=consumer["headers"],
        json={"order_id": order_id, "operation": "BALANCE"},
    ).json()
    client.post(f"/api/v1/payments/{intent['id']}/confirm", headers=consumer["headers"])

    for status in ("PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED"):
        step = client.post(
            f"/api/v1/orders/{order_id}/status",
            headers=farmer["headers"],
            json={"status": status},
        )
        assert step.status_code == 200, step.text

    quality = client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=consumer["headers"],
        json={"status": "QUALITY_CHECK"},
    )
    assert quality.status_code == 200, quality.text
    assert quality.json()["status"] == "QUALITY_CHECK"

    completed = client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=consumer["headers"],
        json={"status": "COMPLETED"},
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["status"] == "COMPLETED"
    assert completed.json()["next_allowed_actions"] == []


def test_consumer_negotiates_with_farmer(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    consumer = complete_consumer(client, db)
    order_id = _consumer_order(client, consumer, listing).json()["id"]

    counter = client.post(
        f"/api/v1/orders/{order_id}/counter",
        headers=farmer["headers"],
        json={
            "quantity": "12",
            "unit": "kg",
            "price": "24.00",
            "delivery_date": DELIVERY_DATE,
            "note": "Best price",
        },
    )
    assert counter.status_code == 200, counter.text
    assert counter.json()["pending_offer_by_role"] == "FARMER"

    accepted = client.post(f"/api/v1/orders/{order_id}/accept", headers=consumer["headers"])
    assert accepted.status_code == 200, accepted.text
    data = accepted.json()
    assert data["status"] == "ACCEPTED"
    assert data["order_type"] == "B2C"
    assert data["agreed_quantity"] == "12.000"
    assert data["agreed_price"] == "24.00"