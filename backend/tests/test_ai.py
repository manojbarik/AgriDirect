def test_ai_price_prediction_success(client):
    payload = {
        "crop_name": "Tomato",
        "variety": "Hybrid",
        "category": "Vegetable",
        "state": "Maharashtra",
        "district": "Nashik",
        "month": 9,
        "quantity_kg": "500.00",
        "grade": "Grade A",
    }
    resp = client.post("/api/v1/ai/price-prediction", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["crop_name"] == "Tomato"
    assert float(data["predicted_price"]) > 0
    assert float(data["price_range_min"]) <= float(data["predicted_price"])
    assert float(data["price_range_max"]) >= float(data["predicted_price"])
    assert data["currency"] == "INR"
    assert data["unit"] == "kg"
    assert data["is_synthetic"] is True
    assert "DEMO / SYNTHETIC" in data["disclaimer"]


def test_ai_price_prediction_minimal_payload(client):
    payload = {"crop_name": "Potato"}
    resp = client.post("/api/v1/ai/price-prediction", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["crop_name"] == "Potato"
    assert float(data["predicted_price"]) > 0


def test_ai_price_prediction_invalid_month(client):
    payload = {"crop_name": "Wheat", "month": 15}
    resp = client.post("/api/v1/ai/price-prediction", json=payload)
    assert resp.status_code == 422
