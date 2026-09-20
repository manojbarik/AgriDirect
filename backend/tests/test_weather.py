def test_forecast_public_without_auth(client):
    resp = client.get(
        "/api/v1/weather/forecast",
        params={"state": "Odisha", "district": "Bhubaneswar", "days": 5},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 5
    for item in data:
        assert item["state"] == "Odisha"
        assert item["district"] == "Bhubaneswar"
        assert "temperature_c" in item
        assert "farming_tip" in item


def test_forecast_rejects_over_7_days(client):
    resp = client.get(
        "/api/v1/weather/forecast",
        params={"state": "Odisha", "district": "Bhubaneswar", "days": 10},
    )
    assert resp.status_code == 422


def test_today_public_without_auth(client):
    resp = client.get(
        "/api/v1/weather/today",
        params={"state": "Odisha", "district": "Bhubaneswar"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data is not None
    assert data["state"] == "Odisha"
    assert data["district"] == "Bhubaneswar"


def test_forecast_deterministic(client):
    def _fetch():
        return [
            {k: v for k, v in item.items() if k != "id"}
            for item in client.get(
                "/api/v1/weather/forecast",
                params={"state": "Odisha", "district": "Cuttack", "days": 3},
            ).json()
        ]

    assert _fetch() == _fetch()


def test_forecast_covers_multiple_states(client):
    for state, district in [
        ("Odisha", "Puri"),
        ("West Bengal", "Kolkata"),
        ("Jharkhand", "Ranchi"),
        ("Telangana", "Hyderabad"),
    ]:
        resp = client.get(
            "/api/v1/weather/forecast",
            params={"state": state, "district": district, "days": 1},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
