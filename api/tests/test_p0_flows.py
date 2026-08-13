from datetime import datetime, timezone
import os

import pytest

from api.app import create_app


TEST_DATABASE = "/tmp/nightlio_test.db"


@pytest.fixture()
def client():
    if os.path.exists(TEST_DATABASE):
        os.remove(TEST_DATABASE)
    app = create_app("testing")
    with app.test_client() as test_client:
        yield test_client
    if os.path.exists(TEST_DATABASE):
        os.remove(TEST_DATABASE)


def _login(client):
    response = client.post("/api/auth/local/login", json={})
    assert response.status_code == 200
    token = response.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}, token


def _entry_payload(content="完成了 P0 验证"):
    now = datetime.now(timezone.utc)
    return {
        "mood": 4,
        "date": now.date().isoformat(),
        "time": now.isoformat().replace("+00:00", "Z"),
        "content": content,
        "category": "work-study",
        "feeling": "踏实",
        "selected_options": [],
    }


def test_create_idempotency_replays_once_and_rejects_key_reuse(client):
    headers, _ = _login(client)
    headers["Idempotency-Key"] = "p0-case-create-0001"
    payload = _entry_payload()

    first = client.post("/api/mood", headers=headers, json=payload)
    replay = client.post("/api/mood", headers=headers, json=payload)
    conflict = client.post(
        "/api/mood", headers=headers, json={**payload, "content": "不同内容"}
    )
    entries = client.get("/api/moods", headers=headers).get_json()

    assert first.status_code == 201
    assert replay.status_code == 200
    assert replay.get_json()["entry_id"] == first.get_json()["entry_id"]
    assert conflict.status_code == 409
    assert len(entries) == 1


def test_create_rejects_invalid_idempotency_key(client):
    headers, _ = _login(client)
    headers["Idempotency-Key"] = "bad key"
    response = client.post("/api/mood", headers=headers, json=_entry_payload())
    assert response.status_code == 400


def test_logout_revokes_old_token_and_fresh_login_recovers(client):
    headers, old_token = _login(client)
    assert client.get("/api/moods", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    assert client.get(
        "/api/moods", headers={"Authorization": f"Bearer {old_token}"}
    ).status_code == 401

    fresh_headers, _ = _login(client)
    assert client.get("/api/moods", headers=fresh_headers).status_code == 200


def test_full_edit_and_permanent_delete_round_trip(client):
    headers, _ = _login(client)
    created = client.post("/api/mood", headers=headers, json=_entry_payload())
    entry_id = created.get_json()["entry_id"]

    updated = client.put(
        f"/api/mood/{entry_id}",
        headers=headers,
        json={
            "content": "修改后的正文",
            "category": "self-care",
            "feeling": None,
            "date": "2025-02-03",
            "time": "2025-02-03T09:15:00+08:00",
        },
    )
    assert updated.status_code == 200
    entry = updated.get_json()["entry"]
    assert entry["content"] == "修改后的正文"
    assert entry["category"] == "self-care"
    assert entry["feeling"] is None
    assert entry["date"] == "2025-02-03"
    assert entry["created_at"] == "2025-02-03T01:15:00Z"

    assert client.delete(f"/api/mood/{entry_id}", headers=headers).status_code == 200
    assert client.get(f"/api/mood/{entry_id}", headers=headers).status_code == 404
