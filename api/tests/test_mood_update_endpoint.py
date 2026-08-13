import os

import pytest

from api.app import create_app

TEST_DB_PATH = "/tmp/nightlio_test.db"


@pytest.fixture()
def client():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    app = create_app("testing")
    with app.test_client() as test_client:
        yield test_client
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _auth_headers(client):
    response = client.post("/api/auth/local/login", json={})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.get_json()['token']}"}


def test_update_little_win_fields_and_archive_round_trip(client):
    headers = _auth_headers(client)
    created = client.post(
        "/api/mood",
        headers=headers,
        json={
            "mood": 4,
            "date": "2024-01-02",
            "time": "2024-01-02T08:30:00+08:00",
            "content": "打开文档并专注了十分钟",
            "category": "work-study",
            "feeling": "平静而坚定",
            "selected_options": [],
        },
    )
    assert created.status_code == 201
    entry = created.get_json()["entry"]
    assert entry["category"] == "work-study"
    assert entry["feeling"] == "平静而坚定"
    assert entry["created_at"].endswith("Z")

    updated = client.put(
        f"/api/mood/{entry['id']}",
        headers=headers,
        json={"content": "完成了十分钟专注", "celebrated": True, "archived": True},
    )
    assert updated.status_code == 200
    updated_entry = updated.get_json()["entry"]
    assert updated_entry["content"] == "完成了十分钟专注"
    assert updated_entry["celebrated"] == 1
    assert updated_entry["archived_at"]

    restored = client.put(
        f"/api/mood/{entry['id']}", headers=headers, json={"archived": False}
    )
    assert restored.status_code == 200
    assert restored.get_json()["entry"]["archived_at"] is None
