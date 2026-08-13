from datetime import datetime, timedelta, timezone
import os
import sqlite3

from jose import jwt
import pytest

from api.app import create_app
from api import config as config_module


TEST_DB_PATH = "/tmp/nightlio_test.db"


@pytest.fixture()
def app_client():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    app = create_app("testing")
    yield app, app.test_client()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _login(client):
    response = client.post("/api/auth/local/login", json={})
    assert response.status_code == 200
    return response.get_json()


def test_protected_resources_require_authentication(app_client):
    _, client = app_client
    assert client.get("/api/moods").status_code == 401
    assert client.post("/api/export/pdf", json={"content": "private"}).status_code == 401


@pytest.mark.parametrize(
    "payload",
    [
        [],
        {"mood": True, "date": "2024-01-01", "content": "x"},
        {"mood": 4, "date": "not-a-date", "content": "x"},
        {"mood": 4, "date": "2024-01-01", "content": " "},
        {"mood": 4, "date": "2024-01-01", "content": "x" * 801},
        {"mood": 4, "date": "2024-01-01", "content": "x", "category": "admin"},
        {"mood": 4, "date": "2024-01-01", "content": "x", "celebrated": True},
        {"mood": 4, "date": "2024-01-01", "content": "x", "selected_options": [True]},
    ],
)
def test_create_rejects_invalid_payloads(app_client, payload):
    _, client = app_client
    headers = {"Authorization": f"Bearer {_login(client)['token']}"}
    response = client.post("/api/mood", headers=headers, json=payload)
    assert response.status_code == 400
    assert response.is_json


def test_list_validates_pagination_and_date_range(app_client):
    _, client = app_client
    headers = {"Authorization": f"Bearer {_login(client)['token']}"}
    assert client.get("/api/moods?limit=0", headers=headers).status_code == 400
    assert client.get("/api/moods?offset=-1", headers=headers).status_code == 400
    assert client.get("/api/moods?start_date=2024-01-01", headers=headers).status_code == 400
    assert (
        client.get(
            "/api/moods?start_date=2024-02-01&end_date=2024-01-01",
            headers=headers,
        ).status_code
        == 400
    )


def test_entry_access_is_scoped_to_token_user(app_client):
    app, client = app_client
    owner = _login(client)
    owner_headers = {"Authorization": f"Bearer {owner['token']}"}
    created = client.post(
        "/api/mood",
        headers=owner_headers,
        json={"mood": 4, "date": "2024-01-01", "content": "owner only"},
    )
    entry_id = created.get_json()["entry_id"]

    with sqlite3.connect(app.config["DATABASE_PATH"]) as conn:
        cursor = conn.execute(
            "INSERT INTO users (google_id, email, name) VALUES (?, ?, ?)",
            ("second-user", "second@example.test", "Second"),
        )
        second_id = cursor.lastrowid
        conn.commit()

    now = datetime.now(timezone.utc)
    second_token = jwt.encode(
        {"user_id": second_id, "iat": now, "exp": now + timedelta(hours=1)},
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    second_headers = {"Authorization": f"Bearer {second_token}"}

    assert client.get(f"/api/mood/{entry_id}", headers=second_headers).status_code == 404
    assert (
        client.put(
            f"/api/mood/{entry_id}",
            headers=second_headers,
            json={"content": "taken"},
        ).status_code
        == 404
    )
    assert client.delete(f"/api/mood/{entry_id}", headers=second_headers).status_code == 404


def test_oversized_request_returns_json_413(app_client):
    _, client = app_client
    response = client.post(
        "/api/auth/local/login",
        data='{"password":"' + ("x" * 70_000) + '"}',
        content_type="application/json",
    )
    assert response.status_code == 413
    assert response.get_json()["error"] == "Request body is too large"


def test_production_refuses_weak_jwt_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "your-jwt-secret-change-this")
    config_module._CONFIG_SINGLETON = None
    try:
        with pytest.raises(RuntimeError, match="JWT_SECRET"):
            create_app("production")
    finally:
        config_module._CONFIG_SINGLETON = None


@pytest.mark.parametrize(
    ("password", "passwordless", "expected"),
    [
        ("short", "0", "LOCAL_ACCESS_PASSWORD"),
        ("", "1", "passwordless"),
    ],
)
def test_production_refuses_unsafe_local_login(
    monkeypatch, password, passwordless, expected
):
    monkeypatch.setenv("JWT_SECRET", "a-unique-production-jwt-secret-1234567890")
    monkeypatch.setenv("LOCAL_ACCESS_PASSWORD", password)
    monkeypatch.setenv("ALLOW_PASSWORDLESS_LOCAL_LOGIN", passwordless)
    monkeypatch.setattr(
        config_module.ProductionConfig,
        "CORS_ORIGINS",
        ["https://little-wins.example"],
    )
    config_module._CONFIG_SINGLETON = None
    try:
        with pytest.raises(RuntimeError, match=expected):
            create_app("production")
    finally:
        config_module._CONFIG_SINGLETON = None
