from datetime import date, timedelta

from tests.helpers import complete_buyer, complete_farmer, create_published_listing


def _within_window() -> str:
    return str(date.today() + timedelta(days=7))


def test_match_farmers_ranks_matching_listing(client, db):
    farmer = complete_farmer(client, db)
    create_published_listing(
        client,
        db,
        farmer,
        unit_price="25.00",
        available_quantity="500.000",
    )

    resp = client.post(
        "/api/v1/ai/match/farmers",
        json={
            "crop_name": "Tomato",
            "quantity_required": "100",
            "unit": "kg",
            "target_price": "26",
            "target_min_price": "20",
            "target_max_price": "30",
            "state": "Maharashtra",
            "district": "Pune",
            "latitude": "18.520",
            "longitude": "73.856",
            "required_by": _within_window(),
            "quality_requirements": "Grade A",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["matches"], "expected at least one farmer match"
    top = data["matches"][0]
    assert float(top["match_score"]) >= 60
    assert top["crop_name"] == "Tomato"
    factor_keys = {f["key"] for f in top["factors"]}
    assert {"crop", "price", "quantity", "location", "timing", "trust"} <= factor_keys
    assert "Crop matches" in top["reasons"]
    assert "Quantity matches" in top["reasons"]


def test_match_farmers_sorted_by_score(client, db):
    farmer = complete_farmer(client, db)
    crop_id = farmer["crop_id"]
    create_published_listing(
        client, db, farmer, crop_id=crop_id, unit_price="25.00", available_quantity="500.000"
    )
    resp = client.post(
        "/api/v1/ai/match/farmers",
        json={
            "crop_name": "Tomato",
            "quantity_required": "100",
            "target_price": "25",
            "required_by": _within_window(),
        },
    )
    assert resp.status_code == 200
    scores = [float(m["match_score"]) for m in resp.json()["matches"]]
    assert scores == sorted(scores, reverse=True)


def test_match_farmers_unknown_crop_returns_empty(client, db):
    complete_farmer(client, db)
    resp = client.post(
        "/api/v1/ai/match/farmers",
        json={
            "crop_name": "Onion",
            "quantity_required": "100",
            "required_by": _within_window(),
        },
    )
    assert resp.status_code == 200
    assert resp.json()["matches"] == []


def test_match_farmers_invalid_payload(client):
    resp = client.post(
        "/api/v1/ai/match/farmers",
        json={"crop_name": "Tomato", "quantity_required": "-5"},
    )
    assert resp.status_code == 422


def test_match_buyers_ranks_demand(client, db):
    farmer = complete_farmer(client, db)
    create_published_listing(client, db, farmer, unit_price="25.00")

    buyer = complete_buyer(client, db)
    demand = client.post(
        "/api/v1/buyer/demands",
        headers=buyer["headers"],
        json={
            "crop_id": farmer["crop_id"],
            "requested_quantity": "200.000",
            "unit": "kg",
            "target_min_price": "20.00",
            "target_max_price": "30.00",
            "required_by": _within_window(),
            "quality_requirements": "Grade A",
        },
    )
    assert demand.status_code == 201, demand.text

    resp = client.post(
        "/api/v1/ai/match/buyers",
        json={
            "crop_name": "Tomato",
            "available_quantity": "500",
            "expected_price": "25",
            "state": "Maharashtra",
            "district": "Nashik",
            "latitude": "19.998",
            "longitude": "73.789",
            "available_from": str(date.today()),
            "available_until": str(date.today() + timedelta(days=30)),
            "grade": "Grade A",
        },
    )
    assert resp.status_code == 200, resp.text
    matches = resp.json()["matches"]
    assert matches, "expected at least one buyer match"
    assert any(m["crop_name"] == "Tomato" for m in matches)
    assert any("Quantity matches" in m["reasons"] for m in matches)


def test_match_buyers_unknown_crop_returns_empty(client, db):
    complete_buyer(client, db)
    resp = client.post(
        "/api/v1/ai/match/buyers",
        json={"crop_name": "Onion", "available_quantity": "100"},
    )
    assert resp.status_code == 200
    assert resp.json()["matches"] == []
