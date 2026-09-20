from tests.helpers import (
    admin_user,
    complete_buyer,
    complete_farmer,
    create_published_listing,
)

DELIVERY_DATE = "2026-10-05"


def _create_order(client, buyer, listing):
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
            "delivery_address_summary": "Shop #12, Test Market, Pune",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _accept_order(client, farmer, buyer, listing):
    order = _create_order(client, buyer, listing)
    resp = client.post(f"/api/v1/orders/{order['id']}/accept", headers=farmer["headers"])
    assert resp.status_code == 200, resp.text
    return order


def _pay_advance(client, buyer, order_id, idempotency="dispute-adv-key"):
    resp = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order_id, "operation": "ADVANCE", "idempotency_key": idempotency},
    )
    assert resp.status_code == 201, resp.text
    confirmed = client.post(
        f"/api/v1/payments/{resp.json()['id']}/confirm", headers=buyer["headers"]
    )
    assert confirmed.status_code == 200, confirmed.text
    return confirmed.json()


def _open_dispute(client, buyer, order_id, category="damaged"):
    resp = client.post(
        "/api/v1/disputes",
        headers=buyer["headers"],
        json={
            "order_id": order_id,
            "category": category,
            "description": "Delivered produce was damaged in transit.",
            "requested_resolution": "refund",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_buyer_can_raise_dispute_and_order_locks(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)
    order_id = order["id"]

    summary = client.get(f"/api/v1/orders/{order_id}", headers=buyer["headers"]).json()
    assert "dispute" in summary["next_allowed_actions"]

    farmer_summary = client.get(f"/api/v1/orders/{order_id}", headers=farmer["headers"]).json()
    assert "dispute" not in farmer_summary["next_allowed_actions"]

    dispute = _open_dispute(client, buyer, order_id)
    assert dispute["status"] == "OPEN"
    assert dispute["order_public_number"]

    locked = client.get(f"/api/v1/orders/{order_id}", headers=buyer["headers"]).json()
    assert locked["status"] == "DISPUTED"
    assert locked["disputed_at"] is not None
    assert locked["pre_dispute_status"] == "ACCEPTED"

    second = client.post(
        "/api/v1/disputes",
        headers=buyer["headers"],
        json={
            "order_id": order_id,
            "category": "damaged",
            "description": "A second dispute attempt.",
            "requested_resolution": "refund",
        },
    )
    assert second.status_code == 409


def test_farmer_cannot_raise_dispute(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)

    resp = client.post(
        "/api/v1/disputes",
        headers=farmer["headers"],
        json={
            "order_id": order["id"],
            "category": "damaged",
            "description": "A farmer cannot open a dispute.",
        },
    )
    assert resp.status_code == 403


def test_admin_reject_restores_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)
    dispute = _open_dispute(client, buyer, order["id"])
    admin = admin_user(db)

    reviewed = client.post(
        f"/api/v1/disputes/admin/{dispute['id']}/review",
        headers=admin["headers"],
        json={"decision": "REJECT", "reason": "Buyer report contradicts delivery records"},
    )
    assert reviewed.status_code == 200, reviewed.text
    body = reviewed.json()
    assert body["status"] == "REJECTED"
    assert body["resolution"] == "REJECTED"
    assert body["resolved_at"] is not None

    restored = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert restored["status"] == "ACCEPTED"
    assert restored["disputed_at"] is None
    assert restored["pre_dispute_status"] is None

    system_entries = [
        e for e in restored["status_events"] if e["changed_by_role"] == "SYSTEM"
    ]
    assert any(e["note"].startswith("Dispute rejected") for e in system_entries)

    roles = [e["changed_by_role"] for e in body["events"]]
    assert roles.count("ADMIN") >= 2


def test_admin_refund_executes_and_closes_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)
    _pay_advance(client, buyer, order["id"])

    detail = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert detail["status"] == "CONFIRMED"

    dispute = _open_dispute(client, buyer, order["id"])
    admin = admin_user(db)

    reviewed = client.post(
        f"/api/v1/disputes/admin/{dispute['id']}/review",
        headers=admin["headers"],
        json={"decision": "REFUND", "reason": "Confirmed quality failure on delivery"},
    )
    assert reviewed.status_code == 200, reviewed.text
    body = reviewed.json()
    assert body["status"] == "CLOSED"
    assert body["resolution"] == "REFUND"
    assert body["resolved_at"] is not None

    refund_events = [e for e in body["events"] if e["entity_type"] == "REFUND"]
    assert refund_events, "refund audit events expected"
    assert refund_events[0]["to_status"] == "SETTLED"

    order_after = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert order_after["status"] == "REFUNDED"
    assert order_after["refunded_at"] is not None
    assert order_after["pre_dispute_status"] is None

    payments = client.get(
        f"/api/v1/payments/orders/{order['id']}", headers=buyer["headers"]
    ).json()
    assert payments[0]["status"] == "REFUNDED"
    assert payments[0]["refunded_amount"] == payments[0]["amount"]

    transition = [
        e for e in order_after["status_events"] if e["to_status"] == "REFUNDED"
    ]
    assert transition and transition[0]["changed_by_role"] == "SYSTEM"


def test_admin_replacement_completes_to_replaced(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)
    dispute = _open_dispute(client, buyer, order["id"], category="substitute")
    admin = admin_user(db)

    approved = client.post(
        f"/api/v1/disputes/admin/{dispute['id']}/review",
        headers=admin["headers"],
        json={"decision": "REPLACEMENT", "reason": "Replacement lot approved"},
    )
    assert approved.status_code == 200, approved.text
    body = approved.json()
    assert body["status"] == "REPLACEMENT_APPROVED"
    assert body["resolution"] == "REPLACEMENT"
    assert body["replacement_status"] == "REQUESTED"
    replacement_id = body["replacement_id"]
    assert replacement_id

    still_open = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert still_open["status"] == "DISPUTED"

    completed = client.post(
        f"/api/v1/disputes/admin/replacements/{replacement_id}/complete",
        headers=admin["headers"],
        json={"reason": "Replacement delivered and accepted"},
    )
    assert completed.status_code == 200, completed.text
    done = completed.json()
    assert done["status"] == "CLOSED"
    assert done["replacement_status"] == "COMPLETED"

    order_after = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert order_after["status"] == "REPLACED"
    assert order_after["replaced_at"] is not None


def test_refund_rejected_when_no_captured_payments(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)
    dispute = _open_dispute(client, buyer, order["id"])
    admin = admin_user(db)

    resp = client.post(
        f"/api/v1/disputes/admin/{dispute['id']}/review",
        headers=admin["headers"],
        json={"decision": "REFUND", "reason": "Refund without any payment"},
    )
    assert resp.status_code == 409


def test_only_admin_can_review_disputes(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)
    dispute = _open_dispute(client, buyer, order["id"])

    resp = client.post(
        f"/api/v1/disputes/admin/{dispute['id']}/review",
        headers=buyer["headers"],
        json={"decision": "REFUND", "reason": "Buyers cannot decide disputes"},
    )
    assert resp.status_code == 403


def test_delivery_sets_quality_deadline_and_receipt_stamps(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)
    order_id = order["id"]

    client.post(
        f"/api/v1/orders/{order_id}/status", headers=buyer["headers"], json={"status": "CONFIRMED"}
    )
    for state in ["PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED"]:
        resp = client.post(
            f"/api/v1/orders/{order_id}/status",
            headers=farmer["headers"],
            json={"status": state},
        )
        assert resp.status_code == 200, resp.text

    delivered = client.get(f"/api/v1/orders/{order_id}", headers=buyer["headers"]).json()
    assert delivered["delivered_at"] is not None
    assert delivered["quality_confirmation_deadline"] is not None

    client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=buyer["headers"],
        json={"status": "QUALITY_CHECK"},
    )
    checking = client.get(f"/api/v1/orders/{order_id}", headers=buyer["headers"]).json()
    assert checking["receipt_confirmed_at"] is not None

    dispute = _open_dispute(client, buyer, order_id)
    assert dispute["order_id"] == order_id


def test_order_disputes_list_party_visible(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)
    _open_dispute(client, buyer, order["id"])

    buyer_list = client.get("/api/v1/disputes", headers=buyer["headers"]).json()
    assert len(buyer_list) == 1
    assert buyer_list[0]["order_id"] == order["id"]

    farmer_list = client.get("/api/v1/disputes", headers=farmer["headers"]).json()
    assert len(farmer_list) == 1

    order_list = client.get(
        f"/api/v1/disputes/orders/{order['id']}", headers=buyer["headers"]
    ).json()
    assert len(order_list) == 1

    by_id = client.get(f"/api/v1/disputes/{buyer_list[0]['id']}", headers=buyer["headers"])
    assert by_id.status_code == 200, by_id.text


def test_admin_queue_and_double_decision_conflict(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accept_order(client, farmer, buyer, listing)
    dispute = _open_dispute(client, buyer, order["id"])
    admin = admin_user(db)

    queue = client.get(
        "/api/v1/disputes/admin/list", headers=admin["headers"], params={"status": "OPEN"}
    )
    assert queue.status_code == 200, queue.text
    assert any(item["id"] == dispute["id"] for item in queue.json())

    first = client.post(
        f"/api/v1/disputes/admin/{dispute['id']}/review",
        headers=admin["headers"],
        json={"decision": "REJECT", "reason": "Rejected on the basis of records"},
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/v1/disputes/admin/{dispute['id']}/review",
        headers=admin["headers"],
        json={"decision": "REFUND", "reason": "Second decision attempt"},
    )
    assert second.status_code == 409