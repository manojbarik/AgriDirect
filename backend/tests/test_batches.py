from tests.helpers import (
    complete_buyer,
    complete_farmer,
    create_crop,
    create_published_listing,
)

DELIVERY_DATE = "2026-10-05"


def _create_order(client, buyer, listing):
    resp = client.post(
        "/api/v1/orders",
        headers=buyer["headers"],
        json={
            "listing_id": listing["id"],
            "quantity": "100",
            "unit": "kg",
            "price": "25.00",
            "delivery_date": DELIVERY_DATE,
            "note": "Please confirm.",
            "delivery_address_summary": "Shop #12, Test Market, Pune",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _confirmed_order(client, farmer, buyer, listing):
    order = _create_order(client, buyer, listing)
    resp = client.post(f"/api/v1/orders/{order['id']}/accept", headers=farmer["headers"])
    assert resp.status_code == 200, resp.text
    resp = client.post(
        f"/api/v1/orders/{order['id']}/status",
        headers=buyer["headers"],
        json={"status": "CONFIRMED"},
    )
    assert resp.status_code == 200, resp.text
    return order, resp.json()["status"]


def _prepare_batch(client, farmer, order_id):
    resp = client.post(
        f"/api/v1/batches/orders/{order_id}/prepare",
        headers=farmer["headers"],
        json={
            "prepared_quantity": "98.000",
            "harvest_date": "2026-09-30",
            "quality_grade": "Grade A",
            "preparation_notes": "Washed and graded at farm",
            "packaging_details": "35 kg crates",
            "photo_references": ["https://cdn.example/batch/1.jpg"],
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_batch_auto_created_when_order_starts_preparing(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _confirmed_order(client, farmer, buyer, listing)

    resp = client.post(
        f"/api/v1/orders/{order['id']}/status",
        headers=farmer["headers"],
        json={"status": "PREPARING"},
    )
    assert resp.status_code == 200

    batches = client.get(
        f"/api/v1/batches/orders/{order['id']}", headers=farmer["headers"]
    )
    assert batches.status_code == 200, batches.text
    body = batches.json()
    assert len(body) == 1
    assert body[0]["status"] == "PREPARING"
    assert body[0]["preparation_status"] == "PREPARING"
    assert body[0]["prepared_quantity"] == "100.000"
    assert body[0]["batch_code"].startswith("BATCH-ORD-")
    assert body[0]["crop_name"] == "Tomato"


def test_prepare_batch_marks_prepared_and_confirms_order_details(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _confirmed_order(client, farmer, buyer, listing)

    batch = _prepare_batch(client, farmer, order["id"])
    assert batch["status"] == "PREPARED"
    assert batch["preparation_status"] == "PREPARED"
    assert batch["pickup_status"] == "NOT_STARTED"
    assert batch["delivery_status"] == "NOT_STARTED"
    assert batch["prepared_quantity"] == "98.000"
    assert batch["harvest_date"] == "2026-09-30"
    assert batch["quality_grade"] == "Grade A"
    assert batch["photo_references"] == ["https://cdn.example/batch/1.jpg"]
    assert batch["prepared_at"] is not None
    assert "inspect" in batch["next_allowed_actions"]

    detail = client.get(f"/api/v1/orders/{order['id']}", headers=farmer["headers"]).json()
    assert detail["status"] == "PREPARING"


def test_result_pass_pickup_and_delivery_syncs_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _confirmed_order(client, farmer, buyer, listing)
    batch = _prepare_batch(client, farmer, order["id"])

    inspected = client.post(
        f"/api/v1/batches/{batch['id']}/inspect",
        headers=farmer["headers"],
        json={
            "result": "PASS",
            "quality_grade": "Grade A",
            "quantity_received": "98.000",
            "damaged_quantity": "0.000",
            "notes": "Looks fresh, consistent size",
        },
    )
    assert inspected.status_code == 200, inspected.text
    assert inspected.json()["status"] == "PASSED"
    assert inspected.json()["quality_checks"][0]["quantity_received"] == "98.000"

    client.post(
        f"/api/v1/orders/{order['id']}/status",
        headers=farmer["headers"],
        json={"status": "READY_FOR_PICKUP"},
    )

    picked_up = client.post(
        f"/api/v1/batches/{batch['id']}/pickup", headers=farmer["headers"]
    )
    assert picked_up.status_code == 200, picked_up.text
    assert picked_up.json()["pickup_status"] == "PICKED_UP"

    order_after_pickup = client.get(
        f"/api/v1/orders/{order['id']}", headers=farmer["headers"]
    ).json()
    assert order_after_pickup["status"] == "IN_TRANSIT"

    delivered = client.post(
        f"/api/v1/batches/{batch['id']}/deliver", headers=farmer["headers"]
    )
    assert delivered.status_code == 200, delivered.text
    assert delivered.json()["delivery_status"] == "DELIVERED"
    assert delivered.json()["status"] == "DELIVERED"

    order_after_delivery = client.get(
        f"/api/v1/orders/{order['id']}", headers=farmer["headers"]
    ).json()
    assert order_after_delivery["status"] == "DELIVERED"
    assert order_after_delivery["delivered_at"] is not None


def test_problem_batch_can_be_disputed(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _confirmed_order(client, farmer, buyer, listing)
    batch = _prepare_batch(client, farmer, order["id"])

    problem = client.post(
        f"/api/v1/batches/{batch['id']}/inspect",
        headers=farmer["headers"],
        json={
            "result": "PROBLEM",
            "quality_grade": "Grade C",
            "quantity_received": "60.000",
            "damaged_quantity": "38.000",
            "notes": "Significant spoilage during transit",
        },
    )
    assert problem.status_code == 200, problem.text
    assert problem.json()["status"] == "PROBLEM"

    disputed = client.post(
        f"/api/v1/batches/{batch['id']}/dispute", headers=farmer["headers"]
    )
    assert disputed.status_code == 200, disputed.text
    assert disputed.json()["status"] == "DISPUTED"
    order_after = client.get(f"/api/v1/orders/{order['id']}", headers=farmer["headers"]).json()
    assert order_after["status"] == "PREPARING"


def test_buyer_can_record_quality_check_and_view_history(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _confirmed_order(client, farmer, buyer, listing)
    batch = _prepare_batch(client, farmer, order["id"])

    first = client.post(
        f"/api/v1/batches/{batch['id']}/inspect",
        headers=farmer["headers"],
        json={"result": "PASS", "quality_grade": "Grade B", "notes": "Initial check"},
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/v1/batches/{batch['id']}/inspect",
        headers=buyer["headers"],
        json={
            "result": "PASS",
            "quality_grade": "Grade A",
            "quantity_received": "95.000",
            "damaged_quantity": "3.000",
            "notes": "Buyer recheck on receipt",
        },
    )
    assert second.status_code == 200, second.text
    assert second.json()["quality_checks"][0]["result"] == "PASS"

    history = client.get(
        f"/api/v1/batches/{batch['id']}/quality-checks", headers=buyer["headers"]
    )
    assert history.status_code == 200
    checks = history.json()
    assert len(checks) == 2
    assert checks[0]["inspector_id"] is not None
    assert checks[0]["quantity_received"] == "95.000"
    assert checks[0]["damaged_quantity"] == "3.000"


def test_pickup_requires_quality_pass(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _confirmed_order(client, farmer, buyer, listing)
    batch = _prepare_batch(client, farmer, order["id"])

    resp = client.post(f"/api/v1/batches/{batch['id']}/pickup", headers=farmer["headers"])
    assert resp.status_code == 409


def test_unowned_batch_access_denied(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order, _ = _confirmed_order(client, farmer, buyer, listing)
    batch = _prepare_batch(client, farmer, order["id"])

    intruder = complete_farmer(client, db, phone="+919000000050")
    resp = client.get(f"/api/v1/batches/{batch['id']}", headers=intruder["headers"])
    assert resp.status_code == 404

    listed = client.get("/api/v1/batches", headers=farmer["headers"])
    assert listed.status_code == 200
    assert any(b["id"] == batch["id"] for b in listed.json())


def test_prepare_uses_agreed_quantity_from_order(client, db):
    crop = create_crop(db, name="Chilli", variety="Green")
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer, crop_id=str(crop.id), title="Fresh chillies")
    buyer = complete_buyer(client, db)

    order = _create_order(client, buyer, listing)
    client.post(f"/api/v1/orders/{order['id']}/accept", headers=farmer["headers"])
    client.post(
        f"/api/v1/orders/{order['id']}/status",
        headers=buyer["headers"],
        json={"status": "CONFIRMED"},
    )

    resp = client.post(
        f"/api/v1/batches/orders/{order['id']}/prepare",
        headers=farmer["headers"],
        json={"preparation_notes": "Packed in ventilated sacks"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["prepared_quantity"] == "100.000"
    assert data["crop_name"] == "Chilli"