import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_system_integrations_endpoint(client):
    response = client.get("/api/v1/system/integrations")
    assert response.status_code == 200
    data = response.json()

    # Verify keys are present
    expected_keys = {"gemini", "weather", "tavily", "smtp", "whatsapp", "telephony", "database"}
    assert expected_keys.issubset(data.keys())

    # Verify values are either configured or not_configured, never raw secret strings
    for key, val in data.items():
        assert val in ("configured", "not_configured"), f"Key {key} leaked sensitive data or unexpected value: {val}"
