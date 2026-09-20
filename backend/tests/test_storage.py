"""Storage intelligence + batch QR traceability tests."""

from __future__ import annotations

from tests.helpers import (
    complete_buyer,
    complete_farmer,
    create_published_listing,
    register_user,
    verify_user,
)

DELIVERY_DATE = "2026-10-05"


def _confirmed_order(client, farmer, buyer, listing) -> tuple[dict, str]:
    order = client.post(
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
    assert order.status_code == 201, order.text
    order_id = order.json()["id"]
    accept = client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])
    assert accept.status_code == 200, accept.text
    conf = client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=buyer["headers"],
        json={"status": "CONFIRMED"},
    )
    assert conf.status_code == 200, conf.text
    return order.json(), conf.json()["status"]


def _prepare_batch(client, farmer, order_id) -> dict:
    prep = client.post(
        f"/api/v1/batches/orders/{order_id}/prepare",
        headers=farmer["headers"],
        json={
            "prepared_quantity": "98.000",
            "quality_grade": "Grade A",
            "harvest_date": "2026-09-30",
            "preparation_notes": "Washed and graded at farm",
            "packaging_details": "35 kg crates",
        },
    )
    assert prep.status_code == 200, prep.text
    return prep.json()


def _setup_order_with_batch(client, db) -> dict:
    farmer = complete_farmer(client, db, phone="+919999900001")
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db, phone="+919999900002")
    order, _ = _confirmed_order(client, farmer, buyer, listing)
    batch = _prepare_batch(client, farmer, order["id"])
    return {"farmer": farmer, "buyer": buyer, "listing": listing, "order": order, "batch": batch}


# --------------------------------------------------------------------------- #
# Storage intelligence
# --------------------------------------------------------------------------- #
class TestStorageIntelligence:
    def test_storage_options_are_listed_with_demo_flag(self, client, db):
        res = client.get(
            "/api/v1/storage/options",
            params={"state": "Odisha", "district": "Bhubaneswar"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["is_demo"] is True
        assert body["disclaimer"]
        assert body["options"]
        option = body["options"][0]
        assert option["id"]
        assert option["storage_type"] in {"COLD_STORAGE", "WAREHOUSE", "GODOWN"}

    def test_sell_now_when_future_price_lower(self, client, db):
        res = client.post(
            "/api/v1/storage/recommendation",
            json={
                "crop_name": "Tomato",
                "quantity_kg": "1000",
                "current_price_per_kg": "25",
                "predicted_price_per_kg": "20",
                "storage_days": 15,
                "storage_cost_per_kg_per_day": "0.05",
                "expected_loss_rate_pct": "5",
                "transaction_cost_pct": "2",
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert body["recommendation_rank"] == "SELL_NOW"
        assert body["is_synthetic"] is True
        assert body["disclaimer"]
        assert body["sell_now"]["net_income"] > body["store_then_sell"]["net_income"]

    def test_store_then_sell_when_future_price_higher(self, client, db):
        res = client.post(
            "/api/v1/storage/recommendation",
            json={
                "crop_name": "Tomato",
                "quantity_kg": "1000",
                "current_price_per_kg": "20",
                "predicted_price_per_kg": "28",
                "storage_days": 14,
                "storage_cost_per_kg_per_day": "0.05",
                "expected_loss_rate_pct": "3",
                "transaction_cost_pct": "2",
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert body["recommendation_rank"] == "STORE_THEN_SELL"
        assert body["breakeven_storage_days"] is not None
        assert body["reasoning"]

    def test_recommendation_uses_ai_forecast_when_not_supplied(self, client, db):
        res = client.post(
            "/api/v1/storage/recommendation",
            json={
                "crop_name": "Tomato",
                "quantity_kg": "500",
                "current_price_per_kg": "21",
                "storage_days": 10,
                "state": "Odisha",
                "district": "Bhubaneswar",
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert body["predicted_price_per_kg"] is not None
        assert body["disclaimer"]


# --------------------------------------------------------------------------- #
# Batch QR traceability
# --------------------------------------------------------------------------- #
class TestBatchQrIdentifier:
    def test_prepared_batch_exposes_qr_identifier(self, client, db):
        setup = _setup_order_with_batch(client, db)
        detail = client.get(
            f"/api/v1/batches/{setup['batch']['id']}",
            headers=setup["buyer"]["headers"],
        )
        assert detail.status_code == 200
        body = detail.json()
        assert body["qr_identifier"]
        assert body["qr_identifier"].startswith("AGRI:")
        assert body["batch_code"]

    def test_batch_list_includes_qr_identifier(self, client, db):
        setup = _setup_order_with_batch(client, db)
        list_batches = client.get("/api/v1/batches", headers=setup["farmer"]["headers"])
        assert list_batches.status_code == 200
        qr_vals = [b.get("qr_identifier") for b in list_batches.json()]
        assert any(v and v.startswith("AGRI:") for v in qr_vals)