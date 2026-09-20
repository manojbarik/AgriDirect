from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.db.models.marketplace import Contract, Order
from tests.helpers import complete_buyer, complete_farmer, create_published_listing


def _near_future(days: int = 4) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def _create_contract(client, buyer, listing, **overrides):
    payload = {
        "listing_id": listing["id"],
        "quantity_kg": "500",
        "agreed_price_per_kg": "22.00",
        "payment_terms": "20% advance, balance on delivery confirmation",
        "delivery_deadline": "2026-10-05T10:00:00Z",
    }
    payload.update(overrides)
    resp = client.post("/api/v1/contracts", headers=buyer["headers"], json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _contract_row(db, contract_id):
    return db.get(Contract, UUID(contract_id))


def test_buyer_creates_contract_and_both_parties_see_it(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)

    created = _create_contract(client, buyer, listing)
    assert created["status"] == "PENDING"
    assert created["contract_number"].startswith("C-")
    assert created["total_amount"] == "11000.00"
    assert created["farmer_id"]
    assert created["buyer_id"]
    assert created["listing_id"] == listing["id"]
    assert created["quantity_kg"] == "500.000"
    assert created["agreed_price_per_kg"] == "22.00"

    buyer_list = client.get("/api/v1/contracts", headers=buyer["headers"]).json()
    assert len(buyer_list) == 1
    assert buyer_list[0]["id"] == created["id"]

    farmer_list = client.get("/api/v1/contracts", headers=farmer["headers"]).json()
    assert len(farmer_list) == 1

    detail = client.get(f"/api/v1/contracts/{created['id']}", headers=farmer["headers"]).json()
    assert detail["status"] == "PENDING"


def test_non_buyer_cannot_create_contract(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)

    resp = client.post(
        "/api/v1/contracts",
        headers=farmer["headers"],
        json={"listing_id": listing["id"], "quantity_kg": "500", "agreed_price_per_kg": "22.00"},
    )
    assert resp.status_code == 403


def test_buyer_cannot_accept_contract(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    contract = _create_contract(client, buyer, listing)

    denied = client.post(f"/api/v1/contracts/{contract['id']}/accept", headers=buyer["headers"])
    assert denied.status_code == 403

    accepted = client.post(f"/api/v1/contracts/{contract['id']}/accept", headers=farmer["headers"])
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["status"] == "ACCEPTED"
    assert accepted.json()["accepted_at"] is not None


def test_counter_updates_terms_and_extending_expiry(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    contract = _create_contract(client, buyer, listing)
    contract_id = contract["id"]

    stale = client.post(
        f"/api/v1/contracts/{contract_id}/counter",
        headers=farmer["headers"],
        json={
            "quantity_kg": "450",
            "agreed_price_per_kg": "21.00",
            "expires_at": "2026-09-05T10:00:00Z",
        },
    )
    assert stale.status_code == 400

    countered = client.post(
        f"/api/v1/contracts/{contract_id}/counter",
        headers=farmer["headers"],
        json={
            "quantity_kg": "450",
            "agreed_price_per_kg": "21.00",
            "payment_terms": "25% advance, balance on delivery",
            "expires_at": _near_future(days=4),
        },
    )
    assert countered.status_code == 200, countered.text
    data = countered.json()
    assert data["status"] == "COUNTERED"
    assert data["quantity_kg"] == "450.000"
    assert data["agreed_price_per_kg"] == "21.00"
    assert data["total_amount"] == "9450.00"
    assert data["payment_terms"] == "25% advance, balance on delivery"

    accepted = client.post(f"/api/v1/contracts/{contract_id}/accept", headers=farmer["headers"])
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["status"] == "ACCEPTED"


def test_reject_and_cancel_paths(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)

    rejected_contract = _create_contract(client, buyer, listing)
    rejected = client.post(
        f"/api/v1/contracts/{rejected_contract['id']}/reject", headers=farmer["headers"]
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["status"] == "CANCELLED"

    cancelled_contract = _create_contract(client, buyer, listing)
    cancelled = client.post(
        f"/api/v1/contracts/{cancelled_contract['id']}/cancel", headers=buyer["headers"]
    )
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "CANCELLED"

    buyer_cannot_reject = client.post(
        f"/api/v1/contracts/{rejected_contract['id']}/reject", headers=buyer["headers"]
    )
    assert buyer_cannot_reject.status_code == 403


def test_contract_expiry_requires_passed_deadline(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    contract = _create_contract(client, buyer, listing)
    contract_id = contract["id"]

    too_soon = client.post(f"/api/v1/contracts/{contract_id}/expire", headers=farmer["headers"])
    assert too_soon.status_code == 409

    row = _contract_row(db, contract_id)
    row.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()

    expired = client.post(f"/api/v1/contracts/{contract_id}/expire", headers=farmer["headers"])
    assert expired.status_code == 200, expired.text
    assert expired.json()["status"] == "EXPIRED"


def test_auto_expire_on_read(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    contract = _create_contract(client, buyer, listing)

    row = _contract_row(db, contract["id"])
    row.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()

    detail = client.get(f"/api/v1/contracts/{contract['id']}", headers=buyer["headers"]).json()
    assert detail["status"] == "EXPIRED"

    listed = client.get("/api/v1/contracts", headers=buyer["headers"]).json()
    assert listed[0]["status"] == "EXPIRED"


def test_create_order_from_accepted_contract(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    contract = _create_contract(client, buyer, listing)
    contract_id = contract["id"]

    not_yet = client.post(
        f"/api/v1/contracts/{contract_id}/create-order", headers=buyer["headers"]
    )
    assert not_yet.status_code == 409

    client.post(f"/api/v1/contracts/{contract_id}/accept", headers=farmer["headers"])

    created = client.post(
        f"/api/v1/contracts/{contract_id}/create-order", headers=buyer["headers"]
    )
    assert created.status_code == 200, created.text
    data = created.json()
    assert data["status"] == "ACTIVE"
    assert data["order_id"]

    order = db.get(Order, UUID(data["order_id"]))
    assert order is not None
    assert order.source_type == "DIRECT_CONTRACT"
    assert order.status == "PENDING"

    again = client.post(
        f"/api/v1/contracts/{contract_id}/create-order", headers=buyer["headers"]
    )
    assert again.status_code == 409

    order_detail = client.get(f"/api/v1/orders/{order.id}", headers=farmer["headers"]).json()
    assert order_detail["status"] == "PENDING"