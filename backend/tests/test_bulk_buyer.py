from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.helpers import (
    complete_buyer,
    complete_bulk_buyer,
    complete_farmer,
    create_published_listing,
    register_user,
    verify_user,
)


def _login(client: TestClient, phone: str, role: str) -> dict[str, Any]:
    reg = register_user(client, phone=phone, role=role)
    tokens = verify_user(client, reg)["tokens"]
    return {"headers": {"Authorization": f"Bearer {tokens['access_token']}"}}


class TestBulkBuyerProfile:
    def test_register_creates_bulk_buyer_profile(self, client: TestClient) -> None:
        reg = register_user(client, phone="+919000000051", role="BULK_BUYER")
        tokens = verify_user(client, reg)["tokens"]
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        profile = client.get("/api/v1/bulk-buyer/profile", headers=headers)
        assert profile.status_code == 200
        assert profile.json()["organization_name"].startswith("Enterprise-")

    def test_create_full_profile(self, client: TestClient, db: Session) -> None:
        data = complete_bulk_buyer(client, db, phone="+919000000052")
        profile = client.get("/api/v1/bulk-buyer/profile", headers=data["headers"])
        assert profile.status_code == 200
        assert profile.json()["org_type"] == "FPO"
        assert profile.json()["gstin"] == "27AADCB2230M1Z5"

    def test_update_profile(self, client: TestClient, db: Session) -> None:
        data = complete_bulk_buyer(client, db, phone="+919000000053")
        updated = client.put(
            "/api/v1/bulk-buyer/profile",
            headers=data["headers"],
            json={"organization_name": "New Alliance FPO", "org_type": "CO_OPERATIVE"},
        )
        assert updated.status_code == 200
        assert updated.json()["organization_name"] == "New Alliance FPO"
        assert updated.json()["org_type"] == "CO_OPERATIVE"

    def test_non_bulk_buyer_gets_403(self, client: TestClient) -> None:
        auth = _login(client, "+919000000054", "BUYER")
        profile = client.get("/api/v1/bulk-buyer/profile", headers=auth["headers"])
        assert profile.status_code == 403

    def test_duplicate_profile_returns_409(self, client: TestClient, db: Session) -> None:
        data = complete_bulk_buyer(client, db, phone="+919000000055")
        dup = client.post(
            "/api/v1/bulk-buyer/profile",
            headers=data["headers"],
            json={
                "organization_name": "Duplicate FPO",
                "org_type": "FPO",
            },
        )
        assert dup.status_code == 409


class TestBulkBuyerDashboard:
    def test_dashboard_without_buyer_profile(self, client: TestClient) -> None:
        auth = _login(client, "+919000000056", "BULK_BUYER")
        dash = client.get("/api/v1/bulk-buyer/dashboard", headers=auth["headers"])
        assert dash.status_code == 200
        body = dash.json()
        assert body["buyer_profile_exists"] is False
        assert body["pending_orders_count"] == 0
        assert body["sourcing_spotlight"] == []

    def test_dashboard_after_full_onboard(self, client: TestClient, db: Session) -> None:
        data = complete_bulk_buyer(client, db, phone="+919000000057")
        dash = client.get("/api/v1/bulk-buyer/dashboard", headers=data["headers"])
        assert dash.status_code == 200
        assert dash.json()["buyer_profile_exists"] is True
        assert dash.json()["verification_status"] == "PENDING"

    def test_dashboard_lists_sourcing_spotlight(self, client: TestClient, db: Session) -> None:
        farmer = complete_farmer(client, db, phone="+919000000058")
        create_published_listing(client, db, farmer, title="Bulk tomato lot")
        bulk = complete_bulk_buyer(client, db, phone="+919000000059")
        dash = client.get("/api/v1/bulk-buyer/dashboard", headers=bulk["headers"]).json()
        assert len(dash["sourcing_spotlight"]) == 1
        assert dash["sourcing_spotlight"][0]["title"] == "Bulk tomato lot"

    def test_dashboard_counts_pending_orders(self, client: TestClient, db: Session) -> None:
        from tests.helpers import create_published_listing

        farmer = complete_farmer(client, db, phone="+919000000060")
        listing = create_published_listing(client, db, farmer, unit_price="40.00", available_quantity="200.000")
        bulk = complete_bulk_buyer(client, db, phone="+919000000061")
        client.post(
            "/api/v1/orders",
            headers=bulk["headers"],
            json={
                "listing_id": listing["id"],
                "quantity": "50.000",
                "price": "40.00",
                "delivery_date": "2026-10-05",
            },
        )
        dash = client.get("/api/v1/bulk-buyer/dashboard", headers=bulk["headers"]).json()
        assert dash["pending_orders_count"] == 1
