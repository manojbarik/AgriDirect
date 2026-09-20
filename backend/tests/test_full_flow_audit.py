"""Full end-to-end business-flow audit (cross-module walkthrough).

Walks both customer journeys and the admin + AI surfaces through the real
HTTP API on an isolated in-memory database:

  FARMER : register -> OTP -> profile -> farm -> location -> crop plan ->
           verification -> listing -> AI price -> buyer matching -> order
           -> payment -> batch -> quality -> delivery -> settlement -> rating
           -> trust score
  BUYER  : register -> OTP -> buyer type -> verification -> marketplace ->
           demand -> AI matching -> order -> payment -> delivery -> quality
           confirmation -> settlement -> rating -> trust score
  ADMIN  : users -> verification -> marketplace -> orders -> payments ->
           quality -> disputes -> refunds -> trust -> analytics
  AI     : price prediction, demand prediction, matching
  DB     : relationships + state machines end-to-end
"""

from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.helpers import (
    admin_user,
    complete_buyer,
    complete_farmer,
    create_published_listing,
)

DELIVERY_DATE = "2026-10-05"
DELIVERY_ADDRESS = "Shop #12, Test Market, Pune"


def _create_order(client: TestClient, buyer: dict, listing: dict) -> dict:
    resp = client.post(
        "/api/v1/orders",
        headers=buyer["headers"],
        json={
            "listing_id": listing["id"],
            "quantity": "100",
            "unit": "kg",
            "price": "25.00",
            "delivery_date": DELIVERY_DATE,
            "note": "Please confirm.",
            "delivery_address_summary": DELIVERY_ADDRESS,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _pay(client: TestClient, buyer: dict, order_id: str, operation: str, key: str) -> dict:
    resp = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order_id, "operation": operation, "idempotency_key": key},
    )
    assert resp.status_code == 201, resp.text
    confirmed = client.post(
        f"/api/v1/payments/{resp.json()['id']}/confirm", headers=buyer["headers"]
    )
    assert confirmed.status_code == 200, confirmed.text
    return confirmed.json()


def _fulfill_batch(client: TestClient, farmer: dict, order_id: str) -> str:
    """Prepare, inspect, pickup, and deliver a batch. Returns the batch id."""
    prepare = client.post(
        f"/api/v1/batches/orders/{order_id}/prepare",
        headers=farmer["headers"],
        json={
            "prepared_quantity": "98.000",
            "harvest_date": "2026-09-30",
            "quality_grade": "Grade A",
            "preparation_notes": "Washed and graded at farm",
            "packaging_details": "35 kg crates",
        },
    )
    assert prepare.status_code == 200, prepare.text
    batch = prepare.json()

    inspect = client.post(
        f"/api/v1/batches/{batch['id']}/inspect",
        headers=farmer["headers"],
        json={
            "result": "PASS",
            "quality_grade": "Grade A",
            "quantity_received": "98.000",
            "damaged_quantity": "0.000",
            "notes": "Fresh, consistent size",
        },
    )
    assert inspect.status_code == 200, inspect.text

    ready = client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=farmer["headers"],
        json={"status": "READY_FOR_PICKUP"},
    )
    assert ready.status_code == 200, ready.text

    pickup = client.post(f"/api/v1/batches/{batch['id']}/pickup", headers=farmer["headers"])
    assert pickup.status_code == 200, pickup.text

    delivered = client.post(f"/api/v1/batches/{batch['id']}/deliver", headers=farmer["headers"])
    assert delivered.status_code == 200, delivered.text
    assert delivered.json()["delivery_status"] == "DELIVERED"
    return batch["id"]


def test_full_farmer_buyer_lifecycle_to_settlement_and_trust(
    client: TestClient, db: Session
) -> None:
    # ---- FARMER onboarding (register -> OTP -> profile -> farm -> location
    # ---- crop plan -> verification) ----
    farmer = complete_farmer(client, db, state="Maharashtra", district="Nashik")
    listing = create_published_listing(
        client, db, farmer, unit_price="25.00", available_quantity="500.000"
    )
    assert listing["status"] == "PUBLISHED"

    # ---- AI: price prediction on the offered crop ----
    price = client.post(
        "/api/v1/ai/price-prediction",
        json={
            "crop_name": "Tomato",
            "category": "Vegetable",
            "state": "Maharashtra",
            "district": "Nashik",
            "month": 9,
            "quantity": 500,
        },
    )
    assert price.status_code == 200, price.text
    assert float(price.json()["predicted_price"]) > 0
    assert price.json()["model_version"]

    # ---- AI: demand prediction ----
    demand_ai = client.post(
        "/api/v1/ai/demand-prediction",
        json={
            "crop_name": "Tomato",
            "category": "Vegetable",
            "state": "Maharashtra",
            "district": "Nashik",
            "month": 9,
            "buyer_type": "RETAILER",
        },
    )
    assert demand_ai.status_code == 200, demand_ai.text
    assert float(demand_ai.json()["predicted_demand"]) > 0

    # ---- BUYER onboarding (register -> OTP -> buyer type -> verification) ----
    buyer = complete_buyer(client, db, buyer_type="RETAILER")
    assert buyer["profile_id"]

    # Buyer demand feeds matching + ordering.
    demand_resp = client.post(
        "/api/v1/buyer/demands",
        headers=buyer["headers"],
        json={
            "crop_id": farmer["crop_id"],
            "requested_quantity": "200.000",
            "unit": "kg",
            "target_min_price": "20.00",
            "target_max_price": "30.00",
            "required_by": str(date.today() + timedelta(days=10)),
            "quality_requirements": "Grade A",
        },
    )
    assert demand_resp.status_code == 201, demand_resp.text

    # ---- AI: farmer matching (buyer -> farmers) ----
    matched_farmers = client.post(
        "/api/v1/ai/match/farmers",
        json={
            "crop_name": "Tomato",
            "quantity_required": "100",
            "target_min_price": "20",
            "target_max_price": "30",
            "state": "Maharashtra",
            "district": "Nashik",
            "required_by": str(date.today() + timedelta(days=10)),
        },
    )
    assert matched_farmers.status_code == 200, matched_farmers.text
    assert matched_farmers.json()["matches"], "farmer matching should rank the listing"

    # ---- AI: buyer matching (farmer -> buyers) ----
    matched_buyers = client.post(
        "/api/v1/ai/match/buyers",
        json={
            "crop_name": "Tomato",
            "available_quantity": "500",
            "expected_price": "25",
            "state": "Maharashtra",
            "district": "Nashik",
            "available_from": str(date.today()),
            "available_until": str(date.today() + timedelta(days=30)),
        },
    )
    assert matched_buyers.status_code == 200, matched_buyers.text
    assert matched_buyers.json()["matches"], "buyer matching should rank the demand"

    # ---- ORDER: buyer requests -> farmer accepts -> buyer pays advance ----
    order = _create_order(client, buyer, listing)
    assert order["status"] == "PENDING"

    accepted = client.post(f"/api/v1/orders/{order['id']}/accept", headers=farmer["headers"])
    assert accepted.status_code == 200, accepted.text

    advance = _pay(client, buyer, order["id"], "ADVANCE", "audit-adv-1")
    assert advance["status"] == "PAID"
    confirmed = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert confirmed["status"] == "CONFIRMED"
    assert confirmed["agreed_price"] == "25.00"
    assert confirmed["total_amount"] == "2500.00"

    # ---- FULFILLMENT: batch -> quality -> pickup -> delivery ----
    _fulfill_batch(client, farmer, order["id"])
    delivered = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert delivered["status"] == "DELIVERED"

    # ---- BUYER quality confirmation -> balance capture -> completion ----
    quality = client.post(
        f"/api/v1/orders/{order['id']}/status",
        headers=buyer["headers"],
        json={"status": "QUALITY_CHECK"},
    )
    assert quality.status_code == 200, quality.text

    balance = _pay(client, buyer, order["id"], "BALANCE", "audit-bal-1")
    assert balance["status"] in ("PAID", "SETTLED")

    completed = client.post(
        f"/api/v1/orders/{order['id']}/status",
        headers=buyer["headers"],
        json={"status": "COMPLETED"},
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["status"] == "COMPLETED"

    # ---- SETTLEMENT + payout (2% fee) ----
    settlement = client.get(
        f"/api/v1/payments/orders/{order['id']}/settlement", headers=farmer["headers"]
    )
    assert settlement.status_code == 200, settlement.text
    s = settlement.json()
    assert float(s["gross_amount"]) == 2500.00
    assert abs(float(s["net_amount"]) - 2450.00) < 0.01
    # payout released at the same time; net_amount equals payout amount

    # ---- RATINGS (two-way, completed order) ----
    rate_buyer = client.post(
        "/api/v1/ratings",
        headers=buyer["headers"],
        json={"order_id": order["id"], "rating": 5, "comment": "Excellent produce"},
    )
    assert rate_buyer.status_code == 201, rate_buyer.text
    rate_farmer = client.post(
        "/api/v1/ratings",
        headers=farmer["headers"],
        json={"order_id": order["id"], "rating": 5, "comment": "Great buyer"},
    )
    assert rate_farmer.status_code == 201, rate_farmer.text
    dup = client.post(
        "/api/v1/ratings",
        headers=buyer["headers"],
        json={"order_id": order["id"], "rating": 4},
    )
    assert dup.status_code == 409, "duplicate rating per order pair must be rejected"

    # ---- TRUST SCORES reflect the completed transaction ----
    farmer_trust = client.get("/api/v1/trust-score/me", headers=farmer["headers"])
    assert farmer_trust.status_code == 200, farmer_trust.text
    assert float(farmer_trust.json()["score"]) > 0
    assert farmer_trust.json()["components"]

    buyer_trust = client.get("/api/v1/trust-score/me", headers=buyer["headers"])
    assert buyer_trust.status_code == 200, buyer_trust.text
    assert float(buyer_trust.json()["score"]) > 0

    # ---- NOTIFICATIONS were emitted throughout ----
    notif = client.get("/api/v1/notifications", headers=farmer["headers"])
    assert notif.status_code == 200
    assert len(notif.json()) > 0, "farmer should have notifications"


def test_admin_flow_moderates_dispute_refund_and_analytics(
    client: TestClient, db: Session
) -> None:
    admin = admin_user(db)

    # Disputed order: advance paid, delivered, then buyer raises a quality dispute.
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _create_order(client, buyer, listing)
    client.post(f"/api/v1/orders/{order['id']}/accept", headers=farmer["headers"])
    _pay(client, buyer, order["id"], "ADVANCE", "audit-dispute-adv")
    _fulfill_batch(client, farmer, order["id"])

    dispute = client.post(
        "/api/v1/disputes",
        headers=buyer["headers"],
        json={
            "order_id": order["id"],
            "category": "damaged",
            "description": "Boxes crushed; 30% damaged.",
            "requested_resolution": "full_refund",
        },
    )
    assert dispute.status_code == 201, dispute.text
    dispute_id = dispute.json()["id"]

    # Order locked into DISPUTED while under review.
    locked = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert locked["status"] == "DISPUTED"

    # Admin list + review.
    queue = client.get("/api/v1/disputes/admin/list", headers=admin["headers"])
    assert queue.status_code == 200, queue.text
    assert any(d["id"] == dispute_id for d in queue.json())

    reviewed = client.post(
        f"/api/v1/disputes/admin/{dispute_id}/review",
        headers=admin["headers"],
        json={"decision": "REFUND", "reason": "Confirmed quality failure on delivery"},
    )
    assert reviewed.status_code == 200, reviewed.text
    assert reviewed.json()["status"] == "CLOSED"
    assert reviewed.json()["resolution"] == "REFUND"

    after = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert after["status"] == "REFUNDED", after["status"]

    # ---- ADMIN analytics surfaces everything ----
    dashboard = client.get("/api/v1/admin/dashboard", headers=admin["headers"])
    assert dashboard.status_code == 200, dashboard.text
    stats = dashboard.json()["statistics"]
    assert stats["orders"] >= 1
    assert stats["payments"] >= 1
    assert stats["refunds"] >= 1
    charts = dashboard.json()["charts"]
    assert "orders" in charts and "transaction_volume" in charts

    for path in (
        "/admin/farmers",
        "/admin/farmers",
        "/admin/orders",
        "/admin/payments",
        "/admin/quality-checks",
        "/admin/trust-scores",
        "/admin/reviews",
        "/admin/refunds",
        "/admin/ai-predictions",
    ):
        resp = client.get(f"/api/v1{path}", headers=admin["headers"])
        assert resp.status_code == 200, resp.text

    # Non-admin cannot reach the admin surface.
    denied = client.get("/api/v1/admin/overview", headers=buyer["headers"])
    assert denied.status_code == 403, denied.text


def test_admin_verification_gates_listing_publish(client: TestClient, db: Session) -> None:
    admin = admin_user(db)

    # Unverified farmer can create a DRAFT listing but MUST NOT publish it.
    farmer = complete_farmer(client, db, verified=False, phone="+919800000011")
    draft = client.post(
        "/api/v1/farmer/listings",
        headers=farmer["headers"],
        json={
            "farm_id": farmer["farm_id"],
            "crop_id": farmer["crop_id"],
            "title": "Fresh tomatoes",
            "grade": "Grade A",
            "unit": "kg",
            "available_quantity": "500.000",
            "unit_price": "25.00",
            "available_from": "2026-09-20",
            "available_until": "2026-10-10",
        },
    )
    assert draft.status_code == 201, draft.text
    listing_id = draft.json()["id"]

    publish = client.put(
        f"/api/v1/farmer/listings/{listing_id}/publish", headers=farmer["headers"]
    )
    assert publish.status_code == 403, "unverified farmer cannot publish a listing"

    # Not visible in the public marketplace while unpublished.
    search = client.get("/api/v1/marketplace/listings").json()
    assert all(item["id"] != listing_id for item in search["items"])

    # Admin verification queue shows the farmer as PENDING.
    farmers = client.get("/api/v1/admin/farmers", headers=admin["headers"]).json()
    item = next(f for f in farmers if f["profile_id"] == farmer["profile_id"])
    assert item["verification_status"] == "PENDING"

    # Admin verifies -> publishing the same listing now succeeds.
    verified = client.post(
        f"/api/v1/admin/farmers/{farmer['profile_id']}/verify", headers=admin["headers"]
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["verification_status"] == "VERIFIED"

    published = client.put(
        f"/api/v1/farmer/listings/{listing_id}/publish", headers=farmer["headers"]
    )
    assert published.status_code == 200, published.text
    assert published.json()["status"] == "PUBLISHED"