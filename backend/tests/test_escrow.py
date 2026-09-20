from uuid import UUID

from sqlalchemy import select

from app.db.models.transaction import EscrowAccount
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
    return order


def _pay_advance(client, buyer, order_id, idempotency="escrow-adv-key"):
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


def _escrow(db, order_id):
    db.expire_all()
    return db.scalar(select(EscrowAccount).where(EscrowAccount.order_id == UUID(order_id)))


def test_no_escrow_until_payment_captured(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accepted_order(client, farmer, buyer, listing)

    resp = client.get(f"/api/v1/escrow/orders/{order['id']}", headers=buyer["headers"])
    assert resp.status_code == 404


def test_advance_capture_funds_escrow(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accepted_order(client, farmer, buyer, listing)

    paid = _pay_advance(client, buyer, order["id"])
    assert paid["status"] == "PAID"

    account = _escrow(db, order["id"])
    assert account is not None
    assert account.status == "FUNDED"
    assert str(account.amount_deposited) == "500.00"
    assert str(account.amount_held) == "500.00"
    assert str(account.amount_released) == "0.00"
    assert str(account.amount_refunded) == "0.00"
    assert account.deposited_at is not None

    view = client.get(f"/api/v1/escrow/orders/{order['id']}", headers=buyer["headers"]).json()
    assert view["status"] == "FUNDED"
    assert view["amount_held"] == "500.00"


def test_full_workflow_releases_escrow_on_completion(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accepted_order(client, farmer, buyer, listing)
    order_id = order["id"]

    _pay_advance(client, buyer, order_id, idempotency="escrow-full-adv")
    _drive_to_quality_check(client, farmer, buyer, order_id)

    balance = client.post(
        "/api/v1/payments/intents",
        headers=buyer["headers"],
        json={"order_id": order_id, "operation": "BALANCE", "idempotency_key": "escrow-full-bal"},
    )
    assert balance.status_code == 201, balance.text
    paid = client.post(
        f"/api/v1/payments/{balance.json()['id']}/confirm", headers=buyer["headers"]
    )
    assert paid.status_code == 200, paid.text
    assert paid.json()["status"] == "SETTLED"

    account = _escrow(db, order_id)
    assert account.status == "FUNDED"
    assert str(account.amount_deposited) == "2500.00"
    assert str(account.amount_held) == "2500.00"

    completed = client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=buyer["headers"],
        json={"status": "COMPLETED"},
    )
    assert completed.status_code == 200, completed.text

    account = _escrow(db, order_id)
    assert account.status == "RELEASED"
    assert str(account.amount_released) == "2500.00"
    assert str(account.amount_held) == "0.00"
    assert account.released_at is not None

    farmer_view = client.get(f"/api/v1/escrow/orders/{order_id}", headers=farmer["headers"]).json()
    assert farmer_view["status"] == "RELEASED"


def test_dispute_refund_moves_held_funds_to_refunded(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accepted_order(client, farmer, buyer, listing)
    order_id = order["id"]
    _pay_advance(client, buyer, order_id, idempotency="escrow-disp-adv")

    dispute = client.post(
        "/api/v1/disputes",
        headers=buyer["headers"],
        json={
            "order_id": order_id,
            "category": "damaged",
            "description": "Delivered produce was damaged.",
            "requested_resolution": "refund",
        },
    )
    assert dispute.status_code == 201, dispute.text
    admin = admin_user(db)
    reviewed = client.post(
        f"/api/v1/disputes/admin/{dispute.json()['id']}/review",
        headers=admin["headers"],
        json={"decision": "REFUND", "reason": "Confirmed quality failure on delivery"},
    )
    assert reviewed.status_code == 200, reviewed.text

    account = _escrow(db, order_id)
    assert account.status == "REFUNDED"
    assert str(account.amount_held) == "0.00"
    assert str(account.amount_refunded) == "500.00"
    assert str(account.amount_released) == "0.00"

    order_after = client.get(f"/api/v1/orders/{order_id}", headers=buyer["headers"]).json()
    assert order_after["status"] == "REFUNDED"


def test_escrow_read_guarded_for_non_parties(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accepted_order(client, farmer, buyer, listing)
    _pay_advance(client, buyer, order["id"], idempotency="escrow-vis-adv")

    intruder = complete_buyer(client, db, phone="+919000000051")
    resp = client.get(f"/api/v1/escrow/orders/{order['id']}", headers=intruder["headers"])
    assert resp.status_code == 404


def test_me_lists_only_my_escrows(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accepted_order(client, farmer, buyer, listing)
    _pay_advance(client, buyer, order["id"], idempotency="escrow-me-adv")

    farmer_list = client.get("/api/v1/escrow/me", headers=farmer["headers"]).json()
    assert len(farmer_list) == 1
    assert farmer_list[0]["order_id"] == order["id"]

    buyer_list = client.get("/api/v1/escrow/me", headers=buyer["headers"]).json()
    assert len(buyer_list) == 1

    intruder = complete_farmer(client, db, phone="+919000000050")
    assert client.get("/api/v1/escrow/me", headers=intruder["headers"]).json() == []


def test_admin_escrow_list_and_filter(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _accepted_order(client, farmer, buyer, listing)
    _pay_advance(client, buyer, order["id"], idempotency="escrow-adm-adv")
    admin = admin_user(db)

    listed = client.get("/api/v1/admin/escrow", headers=admin["headers"]).json()
    assert len(listed) == 1
    assert listed[0]["order_id"] == order["id"]
    assert listed[0]["status"] == "FUNDED"

    funded = client.get(
        "/api/v1/admin/escrow", headers=admin["headers"], params={"status": "FUNDED"}
    ).json()
    assert len(funded) == 1

    released = client.get(
        "/api/v1/admin/escrow", headers=admin["headers"], params={"status": "RELEASED"}
    ).json()
    assert len(released) == 0

    denied = client.get("/api/v1/admin/escrow", headers=buyer["headers"])
    assert denied.status_code == 403