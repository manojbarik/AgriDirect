from tests.helpers import bearer, complete_farmer, register_user, verify_user


def _login_farmer(client, phone):
    reg = register_user(client, phone=phone)
    tokens = verify_user(client, reg)["tokens"]
    return bearer(tokens["access_token"])


def _login_farmer(client, phone):
    reg = register_user(client, phone=phone)
    tokens = verify_user(client, reg)["tokens"]
    return bearer(tokens["access_token"])


def test_create_list_update_delete(client, db):
    headers = complete_farmer(client, db)["headers"]
    created = client.post(
        "/api/v1/farm-notes",
        headers=headers,
        json={
            "crop": "Tomato",
            "note": "Watered the field in the morning.",
            "note_date": "2026-09-07",
            "note_time": "06:30:00",
            "harvest_info": "Expected yield 500kg",
        },
    )
    assert created.status_code == 201, created.text
    note = created.json()
    assert note["crop"] == "Tomato"
    assert note["note_date"] == "2026-09-07"

    listed = client.get("/api/v1/farm-notes", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    updated = client.put(
        f"/api/v1/farm-notes/{note['id']}",
        headers=headers,
        json={"note": "Watered again in evening."},
    )
    assert updated.status_code == 200
    assert updated.json()["note"] == "Watered again in evening."

    deleted = client.delete(f"/api/v1/farm-notes/{note['id']}", headers=headers)
    assert deleted.status_code == 204

    assert client.get(f"/api/v1/farm-notes/{note['id']}", headers=headers).status_code == 404


def test_owner_check_other_farmer_404(client, db):
    f1 = complete_farmer(client, db, phone="+919200000001")
    note = client.post(
        "/api/v1/farm-notes",
        headers=f1["headers"],
        json={"crop": "Potato", "note": "Check tubers", "note_date": "2026-09-07"},
    ).json()

    f2 = complete_farmer(client, db, phone="+919200000002")
    assert client.get(f"/api/v1/farm-notes/{note['id']}", headers=f2["headers"]).status_code == 404
    assert (
        client.put(
            f"/api/v1/farm-notes/{note['id']}",
            headers=f2["headers"],
            json={"note": "hijack"},
        ).status_code
        == 404
    )
    assert (
        client.delete(f"/api/v1/farm-notes/{note['id']}", headers=f2["headers"]).status_code == 404
    )


def test_farmer_only_access(client, db):
    from tests.helpers import complete_buyer

    buyer = complete_buyer(client, db, phone="+919200000004")
    assert client.get("/api/v1/farm-notes", headers=buyer["headers"]).status_code == 403
