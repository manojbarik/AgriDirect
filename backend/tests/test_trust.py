from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from app.db.models.marketplace import CropBatch, Order, OrderStatusEvent
from app.db.models.people import BuyerProfile, FarmerProfile
from app.db.models.social import Rating
from app.db.models.transaction import Payment, QualityCheck
from tests.helpers import admin_user, complete_buyer, complete_farmer


def _farmer(db, client):
    data = complete_farmer(client, db)
    return db.get(FarmerProfile, UUID(data["profile_id"])), data["headers"]


def _buyer(db, client):
    data = complete_buyer(client, db)
    return db.get(BuyerProfile, UUID(data["profile_id"])), data["headers"]


def _order(db, farmer, buyer, seq=0, *, status="COMPLETED", on_time=True):
    order = Order(
        public_order_number=f"ORD-TRUST-{farmer.id.hex[:6]}-{seq}",
        farmer_id=farmer.id,
        buyer_id=buyer.id,
        status=status,
        total_amount=Decimal("2500.00"),
    )
    if status in ("COMPLETED", "QUALITY_CHECK", "REFUNDED", "REPLACED", "DISPUTED"):
        order.delivered_at = datetime(2026, 9, 1, tzinfo=timezone.utc)
        order.expected_delivery_date = date(2026, 9, 2) if on_time else date(2026, 8, 25)
    else:
        order.expected_delivery_date = date(2026, 9, 2)
    if status == "COMPLETED":
        order.completed_at = datetime(2026, 9, 2, tzinfo=timezone.utc)
        order.receipt_confirmed_at = datetime(2026, 9, 2, tzinfo=timezone.utc)
    db.add(order)
    db.flush()
    return order


def _cancel(db, order, role):
    db.add(
        OrderStatusEvent(
            order_id=order.id,
            from_status="CONFIRMED",
            to_status="CANCELLED",
            changed_by_role=role,
        )
    )
    db.flush()


def _rating(db, order, rater_id, rated_id, score):
    db.add(
        Rating(order_id=order.id, rater_id=rater_id, rated_user_id=rated_id, score=score)
    )
    db.flush()


def _batch(db, order, farmer):
    batch = CropBatch(
        order_id=order.id,
        farmer_id=farmer.id,
        batch_code=f"BATCH-TRUST-{order.id.hex[:8]}",
        prepared_quantity=Decimal("100.000"),
        status="PREPARING",
        preparation_status="PREPARING",
    )
    db.add(batch)
    db.flush()
    return batch


def _quality(db, batch, result="PASS"):
    db.add(
        QualityCheck(
            batch_id=batch.id,
            result=result,
            quantity_received=Decimal("100.000"),
            checked_at=datetime(2026, 9, 1, tzinfo=timezone.utc),
        )
    )
    db.flush()


def _payment(db, order, payer_id, operation="ADVANCE", status="PAID", seq=0):
    db.add(
        Payment(
            order_id=order.id,
            payer_id=payer_id,
            operation=operation,
            amount=Decimal("500.00"),
            currency="INR",
            status=status,
            idempotency_key=f"{operation}-{order.id}-{seq}",
        )
    )
    db.flush()


def test_trust_me_requires_auth(client, db):
    resp = client.get("/api/v1/trust-score/me")
    assert resp.status_code == 401


def test_admin_is_not_scored(client, db):
    admin = admin_user(db)
    resp = client.get("/api/v1/trust-score/me", headers=admin["headers"])
    assert resp.status_code == 403


def test_verified_farmer_score_and_explanation(client, db):
    farmer, headers = _farmer(db, client)
    buyer, _ = _buyer(db, client)

    for seq in range(2):
        order = _order(db, farmer, buyer, seq=seq)
        batch = _batch(db, order, farmer)
        _quality(db, batch)
        _rating(db, order, buyer.user_id, farmer.user_id, 5)
    db.commit()

    resp = client.get("/api/v1/trust-score/me", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["role"] == "FARMER"
    assert data["score"] == "92.00"
    assert data["score_band"] == "HIGH"
    assert data["calculation_version"] == "v1"

    why = data["why"]
    assert "Verified identity" in why
    assert "2 successful orders" in why
    assert "100% on-time completion" in why
    assert "100% quality confirmation rate" in why
    assert "5.0/5 average rating" in why
    assert "Low dispute rate" in why
    assert data["concerns"] == []
    assert data["limits_note"]

    components = {c["key"]: c for c in data["components"]}
    assert float(components["verification"]["points"]) == 20.0
    assert float(components["transaction"]["points"]) >= 15.0
    assert float(components["rating"]["points"]) == 20.0


def test_farmer_cancellations_and_disputes_reduce_score(client, db):
    farmer, headers = _farmer(db, client)
    buyer, _ = _buyer(db, client)

    for seq in range(3):
        order = _order(db, farmer, buyer, seq=seq, status="CANCELLED", on_time=False)
        _cancel(db, order, "FARMER")
    db.commit()

    resp = client.get("/api/v1/trust-score/me", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["score"] == "35.00"
    assert data["score_band"] == "LOW"
    assert "100% cancellation rate" in data["concerns"]
    assert "Low dispute rate" in data["why"]


def test_buyer_score_and_explanation(client, db):
    farmer, _ = _farmer(db, client)
    buyer, headers = _buyer(db, client)

    for seq in range(2):
        order = _order(db, farmer, buyer, seq=seq)
        _payment(db, order, buyer.user_id, operation="ADVANCE", seq=0)
        _payment(db, order, buyer.user_id, operation="BALANCE", seq=1)
        _rating(db, order, farmer.user_id, buyer.user_id, 4 + seq)
    db.commit()

    resp = client.get("/api/v1/trust-score/me", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["role"] == "BUYER"
    assert data["score"] == "87.00"
    assert data["score_band"] == "HIGH"

    why = data["why"]
    assert "Verified identity" in why
    assert "2 fully paid orders" in why
    assert "100% payment reliability" in why
    assert "100% completed orders" in why
    assert "4.5/5 average rating" in why
    assert "Low dispute rate" in why

    components = {c["key"]: c for c in data["components"]}
    assert float(components["transaction"]["points"]) == 17.0
    assert float(components["quality"]["points"]) == 20.0


def test_history_records_score_changes(client, db):
    farmer, headers = _farmer(db, client)
    buyer, _ = _buyer(db, client)

    first = client.get("/api/v1/trust-score/me", headers=headers).json()
    assert first["score"] == "20.00"
    assert first["score_band"] == "LOW"
    assert len(first["history"]) == 1
    assert first["history"][0]["reason"] == "INITIAL"

    order = _order(db, farmer, buyer, seq=0)
    batch = _batch(db, order, farmer)
    _quality(db, batch)
    _rating(db, order, buyer.user_id, farmer.user_id, 5)
    db.commit()

    second = client.get("/api/v1/trust-score/me", headers=headers).json()
    assert second["score"] == "91.00"
    assert len(second["history"]) == 2
    assert second["history"][0]["reason"] == "RECALCULATED"
    assert second["history"][1]["reason"] == "INITIAL"


def test_fresh_user_has_no_transaction_history_note(client, db):
    farmer, headers = _farmer(db, client)
    resp = client.get("/api/v1/trust-score/me", headers=headers)
    data = resp.json()
    assert data["score"] == "20.00"
    assert data["why"] == ["Verified identity"]


def test_admin_trust_score_endpoints(client, db):
    farmer, farmer_headers = _farmer(db, client)
    buyer, buyer_headers = _buyer(db, client)
    client.get("/api/v1/trust-score/me", headers=farmer_headers)
    client.get("/api/v1/trust-score/me", headers=buyer_headers)
    admin = admin_user(db)

    listed = client.get("/api/v1/admin/trust-scores", headers=admin["headers"])
    assert listed.status_code == 200, listed.text
    items = listed.json()
    assert any(item["user_id"] == str(farmer.user_id) for item in items)
    assert any(item["user_id"] == str(buyer.user_id) for item in items)

    farmers_only = client.get(
        "/api/v1/admin/trust-scores", headers=admin["headers"], params={"role": "FARMER"}
    )
    assert farmers_only.status_code == 200
    assert all(item["role"] == "FARMER" for item in farmers_only.json())

    detail = client.get(
        f"/api/v1/admin/trust-scores/{farmer.user_id}", headers=admin["headers"]
    )
    assert detail.status_code == 200, detail.text
    assert detail.json()["user_id"] == str(farmer.user_id)
    assert detail.json()["role"] == "FARMER"

    recalc = client.post(
        f"/api/v1/admin/trust-scores/{buyer.user_id}/recalculate",
        headers=admin["headers"],
    )
    assert recalc.status_code == 200, recalc.text
    assert recalc.json()["history"][0]["reason"] == "ADMIN_RECALCULATED"
    assert recalc.json()["history"][0]["changed_by_role"] == "ADMIN"


def test_admin_trust_guard_and_404s(client, db):
    farmer, headers = _farmer(db, client)
    admin = admin_user(db)

    resp = client.get("/api/v1/admin/trust-scores", headers=headers)
    assert resp.status_code == 403

    resp = client.get(
        f"/api/v1/admin/trust-scores/{admin['user_id']}", headers=admin["headers"]
    )
    assert resp.status_code == 404

    resp = client.get(
        "/api/v1/admin/trust-scores/00000000-0000-0000-0000-000000000000",
        headers=admin["headers"],
    )
    assert resp.status_code == 404


def test_buyer_failed_payments_reduce_reliability(client, db):
    farmer, _ = _farmer(db, client)
    buyer, headers = _buyer(db, client)

    order = _order(db, farmer, buyer, seq=0)
    _payment(db, order, buyer.user_id, operation="ADVANCE", status="PAID", seq=0)
    _payment(db, order, buyer.user_id, operation="ADVANCE", status="FAILED", seq=1)
    db.commit()

    resp = client.get("/api/v1/trust-score/me", headers=headers)
    data = resp.json()
    assert data["score"] == "66.00"
    assert "50% payment reliability" in data["why"]