from tests.helpers import (
    complete_buyer,
    complete_farmer,
    complete_logistics,
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


def _ready_for_pickup(client, farmer, buyer, order_id):
    resp = client.post(f"/api/v1/orders/{order_id}/accept", headers=farmer["headers"])
    assert resp.status_code == 200, resp.text
    resp = client.post(
        f"/api/v1/orders/{order_id}/status",
        headers=buyer["headers"],
        json={"status": "CONFIRMED"},
    )
    assert resp.status_code == 200, resp.text
    for status in ("PREPARING", "READY_FOR_PICKUP"):
        resp = client.post(
            f"/api/v1/orders/{order_id}/status",
            headers=farmer["headers"],
            json={"status": status},
        )
        assert resp.status_code == 200, resp.text
    return client.get(f"/api/v1/orders/{order_id}", headers=farmer["headers"]).json()


def _setup_ready_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _create_order(client, buyer, listing)
    ready = _ready_for_pickup(client, farmer, buyer, order["id"])
    assert ready["status"] == "READY_FOR_PICKUP", ready
    return farmer, buyer, ready


def test_logistics_full_shipment_lifecycle(client, db):
    farmer, buyer, ready = _setup_ready_order(client, db)
    logistics = complete_logistics(client)
    order_id = ready["id"]

    awaiting = client.get("/api/v1/logistics/orders/awaiting", headers=logistics["headers"])
    assert awaiting.status_code == 200, awaiting.text
    assert any(item["id"] == order_id for item in awaiting.json())

    assigned = client.post(
        "/api/v1/logistics/shipments",
        headers=logistics["headers"],
        json={
            "order_id": order_id,
            "driver_name": "Driver Rao",
            "vehicle_label": "MH-12-TR-9090",
        },
    )
    assert assigned.status_code == 201, assigned.text
    trip = assigned.json()
    assert trip["status"] == "ASSIGNED"
    assert trip["order_number"] == ready["public_order_number"]
    assert trip["driver_name"] == "Driver Rao"
    assert trip["total_stops"] == 4
    assert trip["origin_label"] and trip["destination_label"]
    assert len(trip["events"]) == 1
    assert trip["events"][0]["event_type"] == "ASSIGNED"

    duplicate = client.post(
        "/api/v1/logistics/shipments",
        headers=logistics["headers"],
        json={"order_id": order_id},
    )
    assert duplicate.status_code == 409, duplicate.text

    shipments = client.get("/api/v1/logistics/shipments", headers=logistics["headers"])
    assert shipments.status_code == 200
    assert len(shipments.json()) == 1

    detail = client.get(
        f"/api/v1/logistics/shipments/{trip['id']}", headers=logistics["headers"]
    )
    assert detail.status_code == 200
    assert detail.json()["current_location_label"] == trip["origin_label"]

    assert order_id == trip["order_id"]

    started = client.post(
        f"/api/v1/logistics/shipments/{trip['id']}/start",
        headers=logistics["headers"],
    )
    assert started.status_code == 200, started.text
    running = started.json()
    assert running["status"] == "IN_TRANSIT"
    assert running["eta_minutes"] is not None
    types = [event["event_type"] for event in running["events"]]
    assert "PICKUP" in types
    assert "ETA_UPDATE" in types

    order_after_start = client.get(f"/api/v1/orders/{order_id}", headers=farmer["headers"])
    assert order_after_start.status_code == 200
    assert order_after_start.json()["status"] == "IN_TRANSIT"

    index = running["current_stop_index"]
    for _ in range(running["total_stops"] - 1 - index):
        advanced = client.post(
            f"/api/v1/logistics/shipments/{trip['id']}/advance",
            headers=logistics["headers"],
        )
        assert advanced.status_code == 200, advanced.text
        assert advanced.json()["current_stop_index"] == index + 1
        index = advanced.json()["current_stop_index"]
    arrived = advanced.json()
    assert arrived["current_stop_index"] == arrived["total_stops"] - 1
    assert arrived["next_stop_label"] is None

    past_end = client.post(
        f"/api/v1/logistics/shipments/{trip['id']}/advance",
        headers=logistics["headers"],
    )
    assert past_end.status_code == 409, past_end.text

    delivered = client.post(
        f"/api/v1/logistics/shipments/{trip['id']}/deliver",
        headers=logistics["headers"],
    )
    assert delivered.status_code == 200, delivered.text
    done = delivered.json()
    assert done["status"] == "DELIVERED"
    assert done["delivered_at"]
    assert done["events"][-1]["event_type"] == "DELIVERED"

    order_after_deliver = client.get(f"/api/v1/orders/{order_id}", headers=farmer["headers"])
    assert order_after_deliver.json()["status"] == "DELIVERED"

    buyer_tracking = client.get(
        f"/api/v1/logistics/orders/{order_id}/tracking", headers=buyer["headers"]
    )
    assert buyer_tracking.status_code == 200, buyer_tracking.text
    assert buyer_tracking.json()["status"] == "DELIVERED"


def test_logistics_role_and_party_guards(client, db):
    farmer, buyer, ready = _setup_ready_order(client, db)
    order_id = ready["id"]

    blocked = client.get("/api/v1/logistics/shipments", headers=farmer["headers"])
    assert blocked.status_code == 403, blocked.text

    before_assign = client.get(
        f"/api/v1/logistics/orders/{order_id}/tracking", headers=buyer["headers"]
    )
    assert before_assign.status_code == 404, before_assign.text

    logistics = complete_logistics(client)
    other_logistics = complete_logistics(client, phone="+919000000004")
    assigned = client.post(
        "/api/v1/logistics/shipments",
        headers=logistics["headers"],
        json={"order_id": order_id},
    )
    assert assigned.status_code == 201, assigned.text

    second_assign = client.post(
        "/api/v1/logistics/shipments",
        headers=other_logistics["headers"],
        json={"order_id": order_id},
    )
    assert second_assign.status_code == 409, second_assign.text

    other_list = client.get("/api/v1/logistics/shipments", headers=other_logistics["headers"])
    assert other_list.status_code == 200
    assert other_list.json() == []

    intruder_list = client.get(
        f"/api/v1/logistics/shipments/{assigned.json()['id']}",
        headers=other_logistics["headers"],
    )
    assert intruder_list.status_code == 404, intruder_list.text

    intruder_tracking = client.get(
        f"/api/v1/logistics/orders/{order_id}/tracking", headers=buyer["headers"]
    )
    assert intruder_tracking.status_code == 200


def test_assign_rejects_ineligible_order(client, db):
    farmer = complete_farmer(client, db)
    listing = create_published_listing(client, db, farmer)
    buyer = complete_buyer(client, db)
    order = _create_order(client, buyer, listing)
    logistics = complete_logistics(client)

    assigned = client.post(
        "/api/v1/logistics/shipments",
        headers=logistics["headers"],
        json={"order_id": order["id"]},
    )
    assert assigned.status_code == 400, assigned.text


def test_live_tracking_and_metrics(client, db):
    farmer, buyer, ready = _setup_ready_order(client, db)
    order_id = ready["id"]
    logistics = complete_logistics(client)

    assign_res = client.post(
        "/api/v1/logistics/shipments",
        headers=logistics["headers"],
        json={
            "order_id": order_id,
            "driver_name": "Ramesh Kumar",
            "vehicle_label": "OD-02-AG-1024",
        },
    )
    assert assign_res.status_code == 201, assign_res.text
    shipment = assign_res.json()
    shipment_id = shipment["id"]
    assert shipment["driver_name"] == "Ramesh Kumar"
    assert shipment["vehicle_label"] == "OD-02-AG-1024"
    assert shipment["pickup_location"]
    assert shipment["destination_location"]

    # Metrics
    metrics_res = client.get("/api/v1/logistics/metrics", headers=logistics["headers"])
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["active_shipments"] >= 1

    # Location endpoint
    loc_res = client.get(f"/api/v1/logistics/shipments/{shipment_id}/location", headers=logistics["headers"])
    assert loc_res.status_code == 200
    loc_data = loc_res.json()
    assert "current_latitude" in loc_data
    assert "distance_remaining_km" in loc_data

    # Timeline endpoint
    timeline_res = client.get(f"/api/v1/logistics/shipments/{shipment_id}/timeline", headers=logistics["headers"])
    assert timeline_res.status_code == 200
    events = timeline_res.json()
    assert len(events) >= 1
    assert events[0]["event_type"] == "ASSIGNED"

    # Status update: PICKUP_SCHEDULED -> IN_TRANSIT
    status_patch = client.patch(
        f"/api/v1/logistics/shipments/{shipment_id}/status",
        headers=logistics["headers"],
        json={"status": "IN_TRANSIT", "note": "Driver picked up goods from farm"},
    )
    assert status_patch.status_code == 200
    updated = status_patch.json()
    assert updated["status"] == "IN_TRANSIT"

    # Advance Demo GPS
    demo_res = client.post(f"/api/v1/logistics/shipments/{shipment_id}/advance-demo", headers=logistics["headers"])
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert demo_data["is_demo_gps"] is True

    # Location update
    loc_patch = client.patch(
        f"/api/v1/logistics/shipments/{shipment_id}/location",
        headers=logistics["headers"],
        json={"latitude": 20.3200, "longitude": 85.8300, "location_label": "Cuttack Highway Checkpoint"},
    )
    assert loc_patch.status_code == 200
    assert loc_patch.json()["current_latitude"] == 20.3200