from tests.helpers import (
    admin_user,
    complete_buyer,
    complete_farmer,
    create_published_listing,
)

DELIVERY_DATE = "2026-10-05"


def _create_order(client, buyer, listing, price="25.00", quantity="100", delivery_date=DELIVERY_DATE):
    return client.post(
        "/api/v1/orders",
        headers=buyer["headers"],
        json={
            "listing_id": listing["id"],
            "quantity": quantity,
            "unit": "kg",
            "price": price,
            "delivery_date": delivery_date,
            "note": "Please confirm.",
            "delivery_address_summary": "Shop #12, Test Market, Pune",
        },
    )


def test_create_order_success(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)

    resp = _create_order(client, buyer, listing)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["my_role"] == "BUYER"
    assert data["unit"] == "kg"
    assert data["requested_quantity"] == "100.000"
    assert data["requested_price"] == "25.00"
    assert data["total_amount"] == "2500.00"
    assert data["listing_title"] == "Fresh tomatoes"
    assert data["farmer_name"] == "Test Farmer"
    assert data["buyer_name"] == "Test Buyer"
    assert data["pending_offer_action"] == "REQUEST"
    assert data["pending_offer_by_role"] == "BUYER"
    assert data["agreed_quantity"] is None
    assert data["public_order_number"].startswith("ORD-")
    assert data["next_allowed_actions"] == ["cancel"]
    assert len(data["negotiation_messages"]) == 1
    msg = data["negotiation_messages"][0]
    assert msg["from_role"] == "BUYER"
    assert msg["action"] == "REQUEST"
    assert float(msg["price"]) == 25.0
    assert len(data["status_events"]) == 1
    assert data["status_events"][0]["to_status"] == "PENDING"


def test_farmer_cannot_create_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)

    resp = _create_order(client, farmer, listing)
    assert resp.status_code == 403


def test_create_order_exceeds_available_quantity(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer, available_quantity="100.000")
    buyer = complete_buyer(client, db)

    resp = _create_order(client, buyer, listing, quantity="150")
    assert resp.status_code == 400


def test_farmer_accepts_purchase_request(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    resp = client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "ACCEPTED"
    assert data["agreed_quantity"] == "100.000"
    assert data["agreed_price"] == "25.00"
    assert data["agreed_delivery_date"] == DELIVERY_DATE
    assert data["total_amount"] == "2500.00"
    orders = {m["action"] for m in data["negotiation_messages"]}
    assert orders == {"ACCEPT", "REQUEST"}
    assert "cancel" in data["next_allowed_actions"]
    assert "dispute" not in data["next_allowed_actions"]


def test_buyer_accepts_farmer_counter_offer(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    counter = client.post(
        f"/api/v1/orders/{order_id}/counter",
        headers=farmer["headers"],
        json={
            "quantity": "120",
            "unit": "kg",
            "price": "23.00",
            "delivery_date": "2026-10-08",
            "note": "Best I can do",
        },
    )
    assert counter.status_code == 200, counter.text
    assert counter.json()["status"] == "NEGOTIATING"
    assert counter.json()["pending_offer_by_role"] == "FARMER"

    accepted = client.post(f"/api/v1/orders/{order_id}/accept", headers=buyer["headers"])
    assert accepted.status_code == 200, accepted.text
    data = accepted.json()
    assert data["status"] == "ACCEPTED"
    assert data["agreed_quantity"] == "120.000"
    assert data["agreed_price"] == "23.00"
    assert data["agreed_delivery_date"] == "2026-10-08"
    assert data["total_amount"] == "2760.00"


def test_buyer_cannot_respond_to_own_offer(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    resp = client.post(f"/api/v1/orders/{order_id}/accept", headers=buyer["headers"])
    assert resp.status_code == 409


def test_reject_and_no_further_negotiation(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    resp = client.post(f"/api/v1/orders/{order_id}/reject", headers=farmer["headers"])
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "REJECTED"

    resp = client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])
    assert resp.status_code == 409


def test_invalid_status_transition_rejected(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    resp = client.post(
        f"/api/v1/orders/{order_id}/status", headers=buyer["headers"], json={"status": "COMPLETED"}
    )
    assert resp.status_code == 409

    resp = client.post(
        f"/api/v1/orders/{order_id}/status", headers=buyer["headers"], json={"status": "PREPARING"}
    )
    assert resp.status_code == 409


def test_wrong_actor_transition_forbidden(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])

    resp = client.post(
        f"/api/v1/orders/{order_id}/status", headers=farmer["headers"], json={"status": "CONFIRMED"}
    )
    assert resp.status_code == 403


def test_full_fulfillment_chain(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])
    client.post(
        f"/api/v1/orders/{order_id}/status", headers=buyer["headers"], json={"status": "CONFIRMED"}
    )
    client.post(
        f"/api/v1/orders/{order_id}/status", headers=farmer["headers"], json={"status": "PREPARING"}
    )
    ready = client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=farmer["headers"],
        json={"status": "READY_FOR_PICKUP"},
    )
    assert ready.json()["status"] == "READY_FOR_PICKUP"
    client.post(
        f"/api/v1/orders/{order_id}/status", headers=farmer["headers"], json={"status": "IN_TRANSIT"}
    )
    delivered = client.post(
        f"/api/v1/orders/{order_id}/status", headers=farmer["headers"], json={"status": "DELIVERED"}
    )
    assert delivered.json()["delivered_at"] is not None
    client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=buyer["headers"],
        json={"status": "QUALITY_CHECK"},
    )
    completed = client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=buyer["headers"],
        json={"status": "COMPLETED"},
    )
    assert completed.status_code == 200, completed.text
    data = completed.json()
    assert data["status"] == "COMPLETED"
    assert data["completed_at"] is not None
    assert data["next_allowed_actions"] == []

    resp = client.post(f"/api/v1/orders/{order_id}/cancel", headers=buyer["headers"])
    assert resp.status_code == 409


def test_cancel_from_pending(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    resp = client.post(f"/api/v1/orders/{order_id}/cancel", headers=buyer["headers"])
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "CANCELLED"


def test_dispute_and_resolution(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])
    resp = client.post(
        "/api/v1/disputes",
        headers=buyer["headers"],
        json={
            "order_id": order_id,
            "category": "damaged",
            "description": "Delivered produce was damaged in transit.",
            "requested_resolution": "refund",
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "OPEN"
    dispute_id = resp.json()["id"]

    detail = client.get(f"/api/v1/orders/{order_id}", headers=buyer["headers"]).json()
    assert detail["status"] == "DISPUTED"
    assert detail["disputed_at"] is not None
    assert detail["pre_dispute_status"] == "ACCEPTED"

    admin = admin_user(db)
    reviewed = client.post(
        f"/api/v1/disputes/admin/{dispute_id}/review",
        headers=admin["headers"],
        json={"decision": "REJECT", "reason": "No evidence of damage"},
    )
    assert reviewed.status_code == 200, reviewed.text
    resolved = reviewed.json()
    assert resolved["status"] == "REJECTED"
    assert resolved["resolution"] == "REJECTED"
    assert resolved["resolved_at"] is not None

    restored = client.get(f"/api/v1/orders/{order_id}", headers=buyer["headers"]).json()
    assert restored["status"] == "ACCEPTED"
    assert restored["disputed_at"] is None
    assert restored["pre_dispute_status"] is None


def test_owner_only_access(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    intruder = complete_farmer(client, db, phone="+919000000050")
    resp = client.get(f"/api/v1/orders/{order_id}", headers=intruder["headers"])
    assert resp.status_code == 404

    resp = client.get(f"/api/v1/orders/{order_id}", headers=buyer["headers"])
    assert resp.status_code == 200


def test_list_orders_and_status_filter(client, db):
    farmer = complete_farmer(client, db)
    listing1 = create_published_listing(client, db, farmer, title="Fresh tomatoes")
    listing2 = create_published_listing(
        client, db, farmer, title="Premium tomatoes", unit_price="30.00"
    )
    buyer = complete_buyer(client, db)
    o1 = _create_order(client, buyer, listing1).json()
    _create_order(client, buyer, listing2)

    resp = client.get("/api/v1/orders", headers=buyer["headers"])
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    client.post(f"/api/v1/orders/{o1['id']}/accept", headers=farmer["headers"])

    resp = client.get(
        "/api/v1/orders", headers=buyer["headers"], params={"status": "ACCEPTED"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["id"] == o1["id"]
    assert body[0]["status"] == "ACCEPTED"

    resp = client.get("/api/v1/orders", headers=farmer["headers"])
    assert resp.status_code == 200
    assert len(resp.json()) == 2
    assert resp.json()[0]["my_role"] == "FARMER"


def test_negotiation_history_kept(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order_id = _create_order(client, buyer, listing).json()["id"]

    client.post(f"/api/v1/orders/{order_id}/counter", headers=farmer["headers"], json={
        "quantity": "110",
        "unit": "kg",
        "price": "24.00",
        "delivery_date": "2026-10-06",
    })
    client.post(f"/api/v1/orders/{order_id}/counter", headers=buyer["headers"], json={
        "quantity": "115",
        "unit": "kg",
        "price": "24.50",
        "delivery_date": "2026-10-07",
    })
    client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])

    detail = client.get(f"/api/v1/orders/{order_id}", headers=buyer["headers"]).json()
    actions = [m["action"] for m in detail["negotiation_messages"]]
    assert actions == ["REQUEST", "COUNTER", "COUNTER", "ACCEPT"]
    assert detail["status_events"][-1]["to_status"] == "ACCEPTED"
    assert detail["agreed_quantity"] == "115.000"
    assert detail["agreed_price"] == "24.50"