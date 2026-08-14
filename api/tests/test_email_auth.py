import os
import sqlite3

import pytest

from api.app import create_app


TEST_DB_PATH = "/tmp/nightlio_test.db"


@pytest.fixture()
def client():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    app = create_app("testing")
    yield app, app.test_client()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _register(client, **overrides):
    payload = {
        "name": "小风",
        "email": "WINNER@example.com ",
        "password": "a calm passphrase 2026",
    }
    payload.update(overrides)
    return client.post("/api/auth/email/register", json=payload)


def test_register_normalizes_email_hashes_password_and_returns_safe_user(client):
    app, http = client
    response = _register(http)
    assert response.status_code == 201
    body = response.get_json()
    assert body["user"]["email"] == "winner@example.com"
    assert set(body["user"]) == {"id", "name", "email", "avatar_url"}
    assert "token" in body

    with sqlite3.connect(app.config["DATABASE_PATH"]) as conn:
        row = conn.execute(
            "SELECT password_hash, auth_provider FROM users WHERE id = ?",
            (body["user"]["id"],),
        ).fetchone()
    assert row[0] != "a calm passphrase 2026"
    assert row[0].startswith("pbkdf2:sha256:1000000$")
    assert row[1] == "email"


def test_duplicate_email_is_rejected_case_insensitively(client):
    _, http = client
    assert _register(http).status_code == 201
    duplicate = _register(http, email="winner@EXAMPLE.com")
    assert duplicate.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        [],
        {"email": "bad", "password": "a calm passphrase 2026"},
        {"email": "win@example.com", "password": "short"},
        {"email": "win@example.com", "password": "a calm passphrase 2026", "admin": True},
        {"email": "x" * 245 + "@example.com", "password": "a calm passphrase 2026"},
    ],
)
def test_register_rejects_invalid_inputs(client, payload):
    _, http = client
    response = http.post("/api/auth/email/register", json=payload)
    assert response.status_code == 400
    assert response.is_json


def test_login_uses_generic_failure_and_token_is_scoped(client):
    _, http = client
    registered = _register(http).get_json()
    ok = http.post(
        "/api/auth/email/login",
        json={"email": "winner@example.com", "password": "a calm passphrase 2026"},
    )
    assert ok.status_code == 200
    assert ok.get_json()["user"]["id"] == registered["user"]["id"]

    wrong = http.post(
        "/api/auth/email/login",
        json={"email": "winner@example.com", "password": "wrong password 2026"},
    )
    missing = http.post(
        "/api/auth/email/login",
        json={"email": "missing@example.com", "password": "wrong password 2026"},
    )
    assert wrong.status_code == missing.status_code == 401
    assert wrong.get_json()["error"] == missing.get_json()["error"]


def test_two_email_accounts_cannot_read_each_others_entries(client):
    _, http = client
    first = _register(http, email="first@example.com").get_json()
    second = _register(http, email="second@example.com").get_json()
    first_headers = {"Authorization": f"Bearer {first['token']}"}
    second_headers = {"Authorization": f"Bearer {second['token']}"}
    created = http.post(
        "/api/mood",
        headers=first_headers,
        json={"mood": 4, "date": "2026-08-13", "content": "only mine"},
    )
    entry_id = created.get_json()["entry_id"]
    assert http.get(f"/api/mood/{entry_id}", headers=second_headers).status_code == 404
    assert http.get("/api/moods", headers=second_headers).get_json() == []


def test_email_registration_does_not_take_over_existing_oauth_email(client):
    app, http = client
    with sqlite3.connect(app.config["DATABASE_PATH"]) as conn:
        conn.execute(
            "INSERT INTO users (google_id, email, name) VALUES (?, ?, ?)",
            ("oauth-user", "shared@example.com", "OAuth User"),
        )
        conn.commit()
    response = _register(http, email="SHARED@example.com")
    assert response.status_code == 409
