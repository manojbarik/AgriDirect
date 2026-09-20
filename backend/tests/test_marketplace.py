from uuid import uuid4

from tests.helpers import (
    complete_buyer,
    complete_farmer,
    create_crop,
    create_published_listing,
)


def test_marketplace_search_q(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer, title="Premium cherry tomatoes")
    create_published_listing(client, db, farmer, title="Fresh potatoes", unit_price="30.00")

    resp = client.get("/api/v1/marketplace/listings", params={"q": "cherry"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == listing["id"]
    assert body["items"][0]["crop_name"] == "Tomato"

    resp = client.get("/api/v1/marketplace/listings", params={"q": "Farmer"})
    assert resp.status_code == 200
    assert resp.json()["total"] == 2


def test_marketplace_filters(client, db):
    tomato = create_crop(db, "Tomato", "Hybrid")
    potato = create_crop(db, "Potato", "Local")
    farmer1 = complete_farmer(client, db, phone="+919000000040")
    farmer2 = complete_farmer(
        client, db, phone="+919000000041", state="Karnataka", district="Bengaluru"
    )

    create_published_listing(
        client, db, farmer1, crop_id=str(tomato.id), unit_price="25.00", state="Maharashtra"
    )
    l_pricey = create_published_listing(
        client,
        db,
        farmer1,
        title="Premium tomatoes",
        crop_id=str(tomato.id),
        unit_price="45.00",
        state="Karnataka",
        district="Bengaluru",
        available_quantity="600.000",
    )
    create_published_listing(
        client, db, farmer2, crop_id=str(potato.id), unit_price="30.00", state="Maharashtra"
    )

    resp = client.get("/api/v1/marketplace/listings", params={"category": "Vegetable"})
    assert resp.status_code == 200
    assert resp.json()["total"] == 3

    resp = client.get("/api/v1/marketplace/listings", params={"state": "Maharashtra"})
    assert resp.status_code == 200
    assert resp.json()["total"] == 2

    resp = client.get("/api/v1/marketplace/listings", params={"crop_id": str(potato.id)})
    assert resp.status_code == 200
    assert resp.json()["total"] == 1

    resp = client.get("/api/v1/marketplace/listings", params={"min_price": "40", "max_price": "50"})
    assert resp.status_code == 200
    pages = resp.json()
    assert pages["total"] == 1
    assert pages["items"][0]["id"] == l_pricey["id"]

    resp = client.get("/api/v1/marketplace/listings", params={"grade": "Grade A"})
    assert resp.status_code == 200
    assert resp.json()["total"] == 3


def test_marketplace_sort_and_pagination(client, db):
    farmer = complete_farmer(client, db)
    create_published_listing(client, db, farmer, unit_price="25.00")
    create_published_listing(client, db, farmer, unit_price="15.00")
    create_published_listing(client, db, farmer, unit_price="45.00")

    resp = client.get(
        "/api/v1/marketplace/listings", params={"sort": "price_asc", "page_size": "1"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["pages"] == 3
    assert len(body["items"]) == 1
    assert body["items"][0]["unit_price"] == "15.00"

    resp = client.get(
        "/api/v1/marketplace/listings", params={"sort": "price_desc", "page_size": "2", "page": "1"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 2
    assert body["items"][0]["unit_price"] == "45.00"

    resp = client.get(
        "/api/v1/marketplace/listings", params={"sort": "price_desc", "page_size": "2", "page": "2"}
    )
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 1

    resp = client.get("/api/v1/marketplace/listings", params={"sort": "bogus"})
    assert resp.status_code == 422


def test_marketplace_listing_detail_and_locations(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)

    detail = client.get(f"/api/v1/marketplace/listings/{listing['id']}")
    assert detail.status_code == 200
    d = detail.json()
    assert d["farmer_name"] == "Test Farmer"
    assert d["farm_name"] == "Test Green Farm"
    assert d["title"] == listing["title"]

    wrong = client.get(f"/api/v1/marketplace/listings/{uuid4()}")
    assert wrong.status_code == 404

    locs = client.get("/api/v1/marketplace/locations")
    assert locs.status_code == 200
    assert {"state": "Maharashtra", "district": "Nashik"} in locs.json()


def test_marketplace_farmer_profile(client, db):
    farmer = complete_farmer(client, db)
    create_published_listing(client, db, farmer)

    resp = client.get(f"/api/v1/marketplace/farmers/{farmer['profile_id']}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["full_name"] == "Test Farmer"
    assert body["active_listings_count"] == 1
    assert len(body["farms"]) == 1
    assert body["farms"][0]["state"] == "Maharashtra"
    assert body["trust_band"] == "NEW"

    wrong = client.get(f"/api/v1/marketplace/farmers/{uuid4()}")
    assert wrong.status_code == 404


def test_catalog_search(client, db):
    create_crop(db, "Tomato", "Hybrid")
    create_crop(db, "Potato", "Local")

    resp = client.get("/api/v1/marketplace/crops", params={"q": "toma"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["name"] == "Tomato"

    resp = client.get("/api/v1/marketplace/crops")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_farmer_delete_listing(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)

    resp = client.delete(f"/api/v1/farmer/listings/{listing['id']}", headers=farmer["headers"])
    assert resp.status_code == 409  # published cannot be deleted

    paused = client.put(f"/api/v1/farmer/listings/{listing['id']}/pause", headers=farmer["headers"])
    assert paused.status_code == 200
    resp = client.delete(f"/api/v1/farmer/listings/{listing['id']}", headers=farmer["headers"])
    assert resp.status_code == 204

    gone = client.get(f"/api/v1/farmer/listings/{listing['id']}", headers=farmer["headers"])
    assert gone.status_code == 404


def test_farmer_delete_other_farmer_listing(client, db):
    farmer = complete_farmer(client, db)
    other = complete_farmer(client, db, phone="+919000000040")
    listing = create_published_listing(client, db, other)

    resp = client.delete(f"/api/v1/farmer/listings/{listing['id']}", headers=farmer["headers"])
    assert resp.status_code == 404


def test_farmer_update_listing(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)

    resp = client.put(
        f"/api/v1/farmer/listings/{listing['id']}",
        headers=farmer["headers"],
        json={"grade": "Grade B", "available_quantity": "400.000"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["grade"] == "Grade B"
    assert body["available_quantity"] == "400.000"


def test_buyer_demand_crud_and_filter(client, db):
    crop = create_crop(db)
    buyer = complete_buyer(client, db)

    created = client.post(
        "/api/v1/buyer/demands",
        headers=buyer["headers"],
        json={
            "crop_id": str(crop.id),
            "requested_quantity": "200.000",
            "target_min_price": "10.00",
            "target_max_price": "30.00",
            "required_by": "2026-10-20",
        },
    )
    assert created.status_code == 201
    demand = created.json()
    assert demand["status"] == "DRAFT"

    d_id = demand["id"]
    detail = client.get(f"/api/v1/buyer/demands/{d_id}", headers=buyer["headers"])
    assert detail.status_code == 200
    assert detail.json()["id"] == d_id

    updated = client.put(
        f"/api/v1/buyer/demands/{d_id}",
        headers=buyer["headers"],
        json={"requested_quantity": "250.000", "required_by": "2026-10-25"},
    )
    assert updated.status_code == 200
    assert updated.json()["requested_quantity"] == "250.000"

    listed = client.get("/api/v1/buyer/demands?status=DRAFT", headers=buyer["headers"])
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    none = client.get("/api/v1/buyer/demands?status=OPEN", headers=buyer["headers"])
    assert len(none.json()) == 0

    cancelled = client.delete(f"/api/v1/buyer/demands/{d_id}", headers=buyer["headers"])
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"

    again = client.delete(f"/api/v1/buyer/demands/{d_id}", headers=buyer["headers"])
    assert again.status_code == 409

    not_mine = client.get(
        f"/api/v1/buyer/demands/{d_id}",
        headers=complete_buyer(client, db, phone="+919000000040")["headers"],
    )
    assert not_mine.status_code == 404


def test_marketplace_requires_no_auth(client, db):
    farmer = complete_farmer(client, db)
    create_published_listing(client, db, farmer)
    resp = client.get("/api/v1/marketplace/listings")
    assert resp.status_code == 200


def test_buyer_demand_from_listing_preset(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)

    resp = client.post(
        "/api/v1/buyer/demands",
        headers=buyer["headers"],
        json={
            "crop_id": listing["crop_id"],
            "requested_quantity": "100.000",
            "required_by": "2026-11-01",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["crop_id"] == listing["crop_id"]
