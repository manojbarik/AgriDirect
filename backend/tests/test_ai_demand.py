def test_demand_prediction_success(client):
    resp = client.post(
        "/api/v1/ai/demand-prediction",
        json={
            "crop_name": "Tomato",
            "state": "Maharashtra",
            "month": 9,
            "buyer_type": "RETAILER",
            "price": "25",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["crop_name"] == "Tomato"
    assert float(data["predicted_demand"]) > 0
    assert data["forecast_period"] == "month"
    assert float(data["predicted_demand_lower"]) <= float(data["predicted_demand"])
    assert float(data["predicted_demand_upper"]) >= float(data["predicted_demand"])
    assert float(data["recommended_quantity"]) > 0
    assert data["model_version"].startswith("v1")
    assert data["is_synthetic"] is True
    assert "SYNTHETIC" in data["disclaimer"]


def test_demand_prediction_minimal_payload(client):
    resp = client.post("/api/v1/ai/demand-prediction", json={"crop_name": "Potato"})
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["predicted_demand"]) > 0
    assert data["is_synthetic"] is True


def test_demand_prediction_invalid_month(client):
    resp = client.post("/api/v1/ai/demand-prediction", json={"crop_name": "Wheat", "month": 13})
    assert resp.status_code == 422
