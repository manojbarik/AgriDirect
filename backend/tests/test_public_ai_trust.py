from uuid import UUID

from sqlalchemy import func, select

from app.db.models import AiPrediction
from app.db.models.people import FarmerProfile
from tests.helpers import complete_buyer, complete_farmer, create_published_listing


def test_public_price_preview_is_auth_free_and_shaped(client, db):
    resp = client.get(
        "/api/v1/ai/public/price-preview",
        params={"crop": "tomato", "state": "Odisha", "district": "Bhubaneswar"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["crop_name"] == "Tomato"
    assert data["currency"] == "INR"
    assert data["unit"] == "kg"
    assert 0 <= data["confidence_score"] <= 1
    assert data["model_version"]
    assert data["estimated_at"]


def test_public_price_preview_422_for_short_crop(client, db):
    resp = client.get("/api/v1/ai/public/price-preview", params={"crop": "x"})
    assert resp.status_code == 422


def test_public_crops_list_is_auth_free(client, db):
    resp = client.get("/api/v1/ai/public/crops")
    assert resp.status_code == 200, resp.text
    crops = resp.json()
    assert "tomato" in crops
    assert isinstance(crops, list)


def test_public_widgets_do_not_record_audit_rows(client, db):
    before = db.scalar(select(func.count()).select_from(AiPrediction)) or 0
    resp = client.get("/api/v1/ai/public/price-preview", params={"crop": "tomato"})
    assert resp.status_code == 200, resp.text
    after = db.scalar(select(func.count()).select_from(AiPrediction)) or 0
    assert after == before


def test_public_trust_overview_no_auth(client, db):
    farmer = complete_farmer(client, db)
    create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)

    client.get("/api/v1/trust-score/me", headers=farmer["headers"])
    client.get("/api/v1/trust-score/me", headers=buyer["headers"])

    resp = client.get("/api/v1/public/trust/overview")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total_farmers"] >= 1
    assert data["total_buyers"] >= 1
    assert sum(data["bands"].values()) >= 2
    assert data["top_farmers"], "expected at least one top farmer"
    top = data["top_farmers"][0]
    assert top["full_name"]
    assert top["score"]
    assert top["state"] == "Maharashtra"
    assert top["listing_count"] >= 1


def test_public_farmer_snapshot_no_auth(client, db):
    farmer = complete_farmer(client, db)
    create_published_listing(client, db, farmer)
    client.get("/api/v1/trust-score/me", headers=farmer["headers"])

    profile = db.get(FarmerProfile, UUID(farmer["profile_id"]))
    resp = client.get(f"/api/v1/public/trust/farmer/{profile.id}")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["farmer_profile_id"] == str(profile.id)
    assert data["farmer_id"] == str(profile.user_id)
    assert data["full_name"] == "Test Farmer"
    assert data["verification_status"] == "VERIFIED"
    assert data["score_band"] in ("NEW", "LOW", "MEDIUM", "HIGH")
    assert data["active_listings_count"] == 1
    assert data["completed_orders"] == 0
    assert data["rating_avg"] is None

    missing = client.get(
        "/api/v1/public/trust/farmer/00000000-0000-0000-0000-000000000001"
    )
    assert missing.status_code == 404


def test_public_ai_rate_limiter_burst_passes(client, db):
    for _ in range(10):
        resp = client.get("/api/v1/ai/public/crops")
        assert resp.status_code == 200


def test_public_trust_rate_limiter_burst_passes(client, db):
    for _ in range(10):
        resp = client.get("/api/v1/public/trust/overview")
        assert resp.status_code == 200