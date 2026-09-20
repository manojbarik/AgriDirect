from app.integrations.payment import MockPaymentProvider
from app.modules.payments import service as payments_service
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


def _accepted_order(client, farmer, buyer, listing):
    order = _create_order(client, buyer, listing)
    resp = client.post(f"/api/v1/orders/{order['id']}/accept", headers=farmer["headers"])
    assert resp.status_code == 200, resp.text
    order["status"] = "ACCEPTED"
    return order, listing


def _pay_advance(client, buyer, order_id, idempotency="adv-key-1"):
    resp = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order_id, "operation": "ADVANCE", "idempotency_key": idempotency},
    )
    assert resp.status_code == 201, resp.text
    payment = resp.json()
    confirmed = client.post(
        f"/api/v1/payments/{payment['id']}/confirm", headers=buyer["headers"]
    )
    assert confirmed.status_code == 200, confirmed.text
    return confirmed.json()


def _drive_to_quality_check(client, farmer, buyer, order_id):
    for state in ["PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED"]:
        resp = client.post(
            f"/api/v1/orders/{order_id}/status",
            headers=farmer["headers"],
            json={"status": state},
        )
        assert resp.status_code == 200, resp.text
    resp = client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=buyer["headers"],
        json={"status": "QUALITY_CHECK"},
    )
    assert resp.status_code == 200, resp.text


def test_create_advance_intent(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)

    resp = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order["id"], "operation": "ADVANCE"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["operation"] == "ADVANCE"
    assert data["amount"] == "500.00"
    assert data["currency"] == "INR"
    assert data["status"] == "PENDING"
    assert data["provider"] == "mock"
    assert data["provider_reference"].startswith("mock-int-")
    assert data["checkout_url"].startswith("https://sandbox-pay.example/")
    assert data["idempotency_key"]


def test_advance_intent_is_idempotent(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)

    first = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order["id"], "operation": "ADVANCE", "idempotency_key": "same-key"},
    )
    second = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order["id"], "operation": "ADVANCE", "idempotency_key": "same-key"},
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_farmer_cannot_create_intent(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)

    resp = client.post(
        "/api/v1/payments/intents",
        headers=farmer["headers"],
        json={"order_id": order["id"], "operation": "ADVANCE"},
    )
    assert resp.status_code == 403


def test_advance_only_due_when_accepted(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _create_order(client, buyer, listing)

    resp = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order["id"], "operation": "ADVANCE"},
    )
    assert resp.status_code == 409


def test_confirm_advance_confirms_the_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)

    paid = _pay_advance(client, buyer, order["id"])
    assert paid["status"] == "PAID"
    assert paid["provider_event_id"].startswith("evt-mock-")

    detail = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert detail["status"] == "CONFIRMED"
    system_event = [e for e in detail["status_events"] if e["changed_by_role"] == "SYSTEM"]
    assert system_event and system_event[-1]["to_status"] == "CONFIRMED"

    resp = client.post(
        f"/api/v1/payments/{paid['id']}/confirm", headers=buyer["headers"]
    )
    assert resp.status_code == 409


def test_webhook_capture_and_duplicate_handling(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)

    intent = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order["id"], "operation": "ADVANCE", "idempotency_key": "wh-key"},
    ).json()

    event_id = "evt-webhook-capture-1"
    resp = client.post(
        "/api/v1/payments/webhook/mock",
        json={
            "event": "payment.captured",
            "reference": intent["provider_reference"],
            "event_id": event_id,
            "status": "PAID",
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True
    assert resp.json()["duplicate"] is False

    payments = client.get("/api/v1/payments", headers=buyer["headers"]).json()
    assert payments[0]["status"] == "PAID"
    assert payments[0]["provider_event_id"] == event_id

    dup = client.post(
        "/api/v1/payments/webhook/mock",
        json={
            "event": "payment.captured",
            "reference": intent["provider_reference"],
            "event_id": event_id,
            "status": "PAID",
        },
    )
    assert dup.json()["duplicate"] is True


def test_webhook_payment_failed(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)

    intent = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order["id"], "operation": "ADVANCE", "idempotency_key": "fail-key"},
    ).json()

    resp = client.post(
        "/api/v1/payments/webhook/mock",
        json={
            "event": "payment.failed",
            "reference": intent["provider_reference"],
            "event_id": "evt-fail-1",
            "status": "FAILED",
        },
    )
    assert resp.status_code == 200
    payments = client.get("/api/v1/payments", headers=buyer["headers"]).json()
    assert payments[0]["status"] == "FAILED"


def test_mock_fail_mode_marks_payment_failed(client, db, monkeypatch):
    monkeypatch.setattr(
        payments_service, "get_payment_provider", lambda: MockPaymentProvider(mode="fail")
    )
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)

    intent = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order["id"], "operation": "ADVANCE"},
    ).json()
    confirmed = client.post(
        f"/api/v1/payments/{intent['id']}/confirm", headers=buyer["headers"]
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "FAILED"
    assert confirmed.json()["failure_code"] == "PAYMENT_DECLINED"

    detail = client.get(f"/api/v1/orders/{order['id']}", headers=buyer["headers"]).json()
    assert detail["status"] == "ACCEPTED"


def test_balance_requires_quality_confirmation(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)

    resp = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order["id"], "operation": "BALANCE"},
    )
    assert resp.status_code == 409


def test_full_payment_workflow_and_settlement(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)

    advance = _pay_advance(client, buyer, order["id"])
    assert advance["operation"] == "ADVANCE"
    assert advance["amount"] == "500.00"

    _drive_to_quality_check(client, farmer, buyer, order["id"])

    balance = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order["id"], "operation": "BALANCE", "idempotency_key": "bal-key"},
    )
    assert balance.status_code == 201, balance.text
    assert balance.json()["amount"] == "2000.00"

    paid = client.post(
        f"/api/v1/payments/{balance.json()['id']}/confirm", headers=buyer["headers"]
    )
    assert paid.status_code == 200, paid.text
    assert paid.json()["status"] == "SETTLED"

    settlement = client.get(
        f"/api/v1/payments/orders/{order['id']}/settlement", headers=farmer["headers"]
    )
    assert settlement.status_code == 200, settlement.text
    data = settlement.json()
    assert data["gross_amount"] == "2500.00"
    assert data["fee_amount"] == "50.00"
    assert data["net_amount"] == "2450.00"
    assert data["status"] == "RELEASED"
    assert data["released_at"] is not None
    assert data["payouts"][0]["status"] == "SETTLED"


def test_refund_full_and_partial(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    admin = admin_user(db)
    order, _ = _accepted_order(client, farmer, buyer, listing)
    paid = _pay_advance(client, buyer, order["id"])

    partial = client.post(
        f"/api/v1/payments/{paid['id']}/refund",
        headers=admin["headers"],
        json={"amount": "200.00", "reason": "Partial adjustment"},
    )
    assert partial.status_code == 200, partial.text
    assert partial.json()["status"] == "SETTLED"

    payments = client.get("/api/v1/payments", headers=buyer["headers"]).json()
    assert payments[0]["status"] == "PARTIALLY_REFUNDED"
    assert payments[0]["refunded_amount"] == "200.00"

    rest = client.post(
        f"/api/v1/payments/{paid['id']}/refund",
        headers=admin["headers"],
        json={"amount": "300.00"},
    )
    assert rest.status_code == 200, rest.text
    payments = client.get("/api/v1/payments", headers=buyer["headers"]).json()
    assert payments[0]["status"] == "REFUNDED"
    assert payments[0]["refunded_amount"] == "500.00"

    buyer_denied = client.post(
        f"/api/v1/payments/{paid['id']}/refund",
        headers=buyer["headers"],
        json={"amount": "100.00"},
    )
    assert buyer_denied.status_code == 403


def test_payment_visibility_limited_to_parties(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _accepted_order(client, farmer, buyer, listing)
    _pay_advance(client, buyer, order["id"])

    buyer_view = client.get(
        f"/api/v1/payments/orders/{order['id']}", headers=buyer["headers"]
    )
    farmer_view = client.get(
        f"/api/v1/payments/orders/{order['id']}", headers=farmer["headers"]
    )
    assert buyer_view.status_code == 200
    assert farmer_view.status_code == 200
    assert len(buyer_view.json()) == 1
    assert len(farmer_view.json()) == 1

    intruder = complete_farmer(client, db, phone="+919000000050")
    assert (
        client.get(f"/api/v1/payments/orders/{order['id']}", headers=intruder["headers"]).status_code
        == 404
    )