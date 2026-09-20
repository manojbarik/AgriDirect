from tests.helpers import complete_farmer, create_published_listing


def _headers(client, db, phone):
    return complete_farmer(client, db, phone=phone)["headers"]


def test_aggregation_packs_to_meet_quantity(client, db):
    farmer = complete_farmer(client, db)
    create_published_listing(client, db, farmer, available_quantity="500.000")
    f2 = complete_farmer(client, db, phone="+919400000002")
    create_published_listing(
        client, db, f2, available_quantity="300.000", title="More tomatoes"
    )

    resp = client.post(
        "/api/v1/ai/aggregation",
        headers=farmer["headers"],
        json={
            "crop_name": "Tomato",
            "quantity_required": "600",
            "state": "Maharashtra",
            "district": "Nashik",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["groups"]) >= 1
    assert float(data["total_quantity"]) == 600.0
    assert float(data["quantity_shortfall"]) == 0.0
    assert "transportation_savings_estimate" in data
    assert "aggregated_share_split" in data
    assert len(data["aggregated_share_split"]) == len(data["groups"])


def test_aggregation_reports_shortfall(client, db):
    farmer = complete_farmer(client, db)
    create_published_listing(client, db, farmer, available_quantity="100.000")

    resp = client.post(
        "/api/v1/ai/aggregation",
        headers=farmer["headers"],
        json={
            "crop_name": "Tomato",
            "quantity_required": "1000",
            "state": "Maharashtra",
            "district": "Nashik",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["total_quantity"]) == 100.0
    assert float(data["quantity_shortfall"]) == 900.0


def test_aggregation_requires_roles(client, db):
    from tests.helpers import complete_buyer

    buyer = complete_buyer(client, db, phone="+919400000010")
    resp = client.post(
        "/api/v1/ai/aggregation",
        headers=buyer["headers"],
        json={"crop_name": "Tomato", "quantity_required": "100"},
    )
    assert resp.status_code == 200


def test_wastage_risk_levels(client, db):
    headers = complete_farmer(client, db)["headers"]

    low = client.post(
        "/api/v1/ai/wastage-risk",
        headers=headers,
        json={
            "crop": "potato",
            "harvest_date": "2026-09-07",
            "storage_condition": "cold",
            "transport_duration_hours": 2,
            "delivery_eta_hours": 1,
            "temperature_c": 20,
            "humidity": 50,
        },
    )
    assert low.status_code == 200
    assert low.json()["risk"] in ("LOW", "MEDIUM", "HIGH")

    high = client.post(
        "/api/v1/ai/wastage-risk",
        headers=headers,
        json={
            "crop": "tomato",
            "harvest_date": "2026-09-07",
            "storage_condition": "ambient",
            "transport_duration_hours": 40,
            "delivery_eta_hours": 30,
            "temperature_c": 40,
            "humidity": 95,
        },
    )
    assert high.json()["risk"] == "HIGH"
    assert 0 <= high.json()["perishability_score"] <= 100

    assert high.json()["perishability_score"] > low.json()["perishability_score"]


def test_route_optimize_all_pickups_once_deterministic(client, db):
    headers = complete_farmer(client, db)["headers"]
    payload = {
        "pickups": [
            {"name": "A", "state": "Odisha", "district": "Bhubaneswar"},
            {"name": "B", "state": "Odisha", "district": "Cuttack"},
            {"name": "C", "state": "Odisha", "district": "Puri"},
        ],
        "destination": {"name": "Hub", "state": "Telangana", "district": "Hyderabad"},
        "vehicle_capacity_kg": "1000",
        "order_quantities_kg": ["100", "200", "150"],
    }
    r1 = client.post("/api/v1/ai/route/optimize", headers=headers, json=payload)
    assert r1.status_code == 200, r1.text
    d1 = r1.json()

    pickup_names = [s["name"] for s in d1["optimized_sequence"][:-1]]
    assert sorted(pickup_names) == ["A", "B", "C"]
    assert d1["optimized_sequence"][-1]["name"] == "Hub"
    assert len(d1["pickups_sequence"]) == 3
    assert float(d1["total_distance_km"]) > 0

    d2 = client.post("/api/v1/ai/route/optimize", headers=headers, json=payload).json()
    assert d1 == d2
