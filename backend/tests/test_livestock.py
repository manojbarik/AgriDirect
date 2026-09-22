from decimal import Decimal
from tests.helpers import bearer, complete_farmer, register_user, verify_user


def test_create_and_list_livestock(client, db):
    farmer = complete_farmer(client, db, phone="+919311111111")
    headers = farmer["headers"]

    payload = {
        "title": "Gir Cow High Milk Yield",
        "category": "CATTLE",
        "breed": "Gir",
        "age_months": 36,
        "health_status": "HEALTHY",
        "price": "45000.00",
        "location": "Anand, Gujarat",
        "quantity": 1,
        "description": "Indigenous Gir breed cow, 12L/day milk yield, vaccinated.",
        "contact_phone": "+919311111111",
        "image_url": "https://example.com/gir-cow.jpg",
    }

    created = client.post("/api/v1/livestock", headers=headers, json=payload)
    assert created.status_code == 201, created.text
    data = created.json()
    assert data["title"] == "Gir Cow High Milk Yield"
    assert data["category"] == "CATTLE"
    assert data["breed"] == "Gir"
    assert Decimal(data["price"]) == Decimal("45000.00")
    listing_id = data["id"]

    # Public list
    resp = client.get("/api/v1/livestock")
    assert resp.status_code == 200
    items = resp.json()
    assert any(item["id"] == listing_id for item in items)

    # Filter by category
    resp = client.get("/api/v1/livestock?category=CATTLE")
    assert resp.status_code == 200
    assert all(item["category"] == "CATTLE" for item in resp.json())

    # Filter by search
    resp = client.get("/api/v1/livestock?search=Anand")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    # Get single listing
    resp = client.get(f"/api/v1/livestock/{listing_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == listing_id

    # List my listings
    resp = client.get("/api/v1/livestock/my", headers=headers)
    assert resp.status_code == 200
    assert any(item["id"] == listing_id for item in resp.json())

    # Update listing
    update_payload = {"price": "42000.00", "description": "Updated price negotiable"}
    resp = client.put(f"/api/v1/livestock/{listing_id}", headers=headers, json=update_payload)
    assert resp.status_code == 200
    assert Decimal(resp.json()["price"]) == Decimal("42000.00")
    assert resp.json()["description"] == "Updated price negotiable"

    # Delete listing
    resp = client.delete(f"/api/v1/livestock/{listing_id}", headers=headers)
    assert resp.status_code == 204

    # Verify deleted
    resp = client.get(f"/api/v1/livestock/{listing_id}")
    assert resp.status_code == 404


def test_livestock_permissions(client, db):
    f1 = complete_farmer(client, db, phone="+919322222221")
    f2 = complete_farmer(client, db, phone="+919322222222")

    payload = {
        "title": "Murrah Buffalo",
        "category": "BUFFALO",
        "breed": "Murrah",
        "age_months": 42,
        "health_status": "HEALTHY",
        "price": "65000.00",
        "location": "Rohtak, Haryana",
        "quantity": 1,
    }

    created = client.post("/api/v1/livestock", headers=f1["headers"], json=payload)
    assert created.status_code == 201
    listing_id = created.json()["id"]

    # Other farmer tries to update - should be 403
    resp = client.put(
        f"/api/v1/livestock/{listing_id}",
        headers=f2["headers"],
        json={"price": "50000.00"},
    )
    assert resp.status_code == 403

    # Other farmer tries to delete - should be 403
    resp = client.delete(f"/api/v1/livestock/{listing_id}", headers=f2["headers"])
    assert resp.status_code == 403
