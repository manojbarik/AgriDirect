from tests.helpers import complete_buyer, register_user, verify_user


def _authed(client, phone, role="FARMER"):
    reg = register_user(client, phone=phone, role=role)
    tokens = verify_user(client, reg)["tokens"]
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_create_group_and_join_leave(client, db):
    headers = _authed(client, "+919300000001")
    created = client.post(
        "/api/v1/community",
        headers=headers,
        json={"name": "Nashik Farmers", "description": "Local farmers group", "cover_emoji": "🌾"},
    )
    assert created.status_code == 201, created.text
    group = created.json()
    assert group["slug"]
    assert group["member_count"] == 1
    assert group["is_public"] is True

    buyer = complete_buyer(client, db, phone="+919300000002")
    joined = client.post(f"/api/v1/community/groups/{group['id']}/join", headers=buyer["headers"])
    assert joined.status_code == 200

    detail = client.get(
        f"/api/v1/community/groups/{group['id']}", headers=buyer["headers"]
    ).json()
    assert detail["member_count"] == 2
    assert detail["joined"] is True
    assert len(detail["member_preview"]) == 2

    left = client.post(f"/api/v1/community/groups/{group['id']}/leave", headers=buyer["headers"])
    assert left.status_code == 200
    detail = client.get(f"/api/v1/community/groups/{group['id']}").json()
    assert detail["member_count"] == 1


def test_public_list_and_detail_without_auth(client, db):
    headers = _authed(client, "+919300000003")
    client.post("/api/v1/community", headers=headers, json={"name": "Public Group"})
    resp = client.get("/api/v1/community/groups")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    detail = client.get(f"/api/v1/community/groups/{resp.json()[0]['id']}")
    assert detail.status_code == 200
    assert detail.json()["joined"] is False


def test_any_role_can_create_group(client, db):
    buyer_headers = complete_buyer(client, db, phone="+919300000004")["headers"]
    resp = client.post(
        "/api/v1/community", headers=buyer_headers, json={"name": "Buyer Circle"}
    )
    assert resp.status_code == 201


def test_post_like_comment_feed(client, db):
    headers = _authed(client, "+919300000005")
    post = client.post(
        "/api/v1/community/posts",
        headers=headers,
        json={"title": "Harvest update", "body": "Tomatoes are ready."},
    )
    assert post.status_code == 201, post.text
    post_id = post.json()["id"]

    liked = client.post(f"/api/v1/community/posts/{post_id}/like", headers=headers)
    assert liked.status_code == 200

    commented = client.post(
        f"/api/v1/community/posts/{post_id}/comments",
        headers=headers,
        json={"body": "Great news!"},
    )
    assert commented.status_code == 200
    assert commented.json()["body"] == "Great news!"

    detail = client.get(f"/api/v1/community/posts/{post_id}").json()
    assert detail["like_count"] == 1
    assert detail["comment_count"] == 1
    assert len(detail["comments"]) == 1
    assert detail["author_name"] is not None

    unliked = client.post(f"/api/v1/community/posts/{post_id}/unlike", headers=headers)
    assert unliked.status_code == 200
    assert client.get(f"/api/v1/community/posts/{post_id}").json()["like_count"] == 0

    feed = client.get("/api/v1/community/feed").json()
    assert len(feed) == 1
    assert feed[0]["id"] == post_id


def test_feed_group_filter_and_sort(client, db):
    h1 = _authed(client, "+919300000006")
    h2 = _authed(client, "+919300000007")
    g1 = client.post("/api/v1/community", headers=h1, json={"name": "Group One"}).json()
    g2 = client.post("/api/v1/community", headers=h2, json={"name": "Group Two"}).json()

    p1 = client.post(
        "/api/v1/community/posts", headers=h1, json={"body": "one", "group_id": g1["id"]}
    ).json()
    p2 = client.post(
        "/api/v1/community/posts", headers=h2, json={"body": "two", "group_id": g2["id"]}
    ).json()

    g1_feed = client.get("/api/v1/community/feed", params={"group_id": g1["id"]}).json()
    assert len(g1_feed) == 1
    assert g1_feed[0]["id"] == p1["id"]

    all_feed = client.get("/api/v1/community/feed").json()
    assert {p["id"] for p in all_feed} == {p1["id"], p2["id"]}
