"""Execute the JSON example catalog as a stable, human-readable API suite."""

from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import sqlite3

from jose import jwt
import pytest

from api.app import create_app


TEST_DB_PATH = "/tmp/nightlio_test.db"
CATALOG_PATH = Path(__file__).parent / "cases" / "little_wins_api_cases.json"
CATALOG = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
CASES = CATALOG["cases"]


def _expand(value):
    if isinstance(value, dict) and set(value) == {"repeat", "length"}:
        return str(value["repeat"]) * int(value["length"])
    if isinstance(value, dict) and set(value) == {"future_minutes"}:
        return (
            datetime.now(timezone.utc) + timedelta(minutes=value["future_minutes"])
        ).isoformat()
    if isinstance(value, dict) and set(value) == {"range"}:
        return list(range(1, int(value["range"]) + 1))
    if isinstance(value, dict):
        return {key: _expand(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_expand(item) for item in value]
    return value


@pytest.fixture(scope="module")
def catalog_context():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    app = create_app("testing")
    client = app.test_client()
    login = client.post("/api/auth/local/login", json={})
    assert login.status_code == 200
    valid_token = login.get_json()["token"]
    now = datetime.now(timezone.utc)
    with sqlite3.connect(app.config["DATABASE_PATH"]) as connection:
        cursor = connection.execute(
            "INSERT INTO users (google_id, email, name) VALUES (?, ?, ?)",
            ("catalog-other-user", "other@example.test", "Other"),
        )
        other_user_id = cursor.lastrowid
        connection.commit()
    tokens = {
        "valid": valid_token,
        "malformed": "this-is-not-a-jwt",
        "missing_exp": jwt.encode(
            {"user_id": login.get_json()["user"]["id"], "iat": now},
            app.config["JWT_SECRET_KEY"],
            algorithm="HS256",
        ),
        "unknown_user": jwt.encode(
            {
                "user_id": 999999,
                "iat": now,
                "exp": now + timedelta(hours=1),
            },
            app.config["JWT_SECRET_KEY"],
            algorithm="HS256",
        ),
        "other_user": jwt.encode(
            {
                "user_id": other_user_id,
                "iat": now,
                "exp": now + timedelta(hours=1),
            },
            app.config["JWT_SECRET_KEY"],
            algorithm="HS256",
        ),
    }
    seed = client.post(
        "/api/mood",
        headers={"Authorization": f"Bearer {valid_token}"},
        json={
            "mood": 4,
            "date": "2024-01-02",
            "content": "seed entry",
            "category": "daily-life",
            "feeling": "steady",
        },
    )
    assert seed.status_code == 201
    yield {
        "app": app,
        "client": client,
        "tokens": tokens,
        "entry_id": seed.get_json()["entry_id"],
    }
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _request(context, case):
    spec = case["request"]
    method = spec["method"].lower()
    path = spec["path"].replace("{entry_id}", str(context["entry_id"]))
    kwargs = {}
    auth_kind = spec.get("auth")
    if auth_kind:
        kwargs["headers"] = {
            "Authorization": f"Bearer {context['tokens'][auth_kind]}"
        }
    if "json" in spec:
        kwargs["json"] = _expand(spec["json"])
    if "raw_repeat" in spec:
        raw = spec["raw_repeat"]
        kwargs["data"] = (
            raw["prefix"] + raw["value"] * int(raw["length"]) + raw["suffix"]
        )
        kwargs["content_type"] = "application/json"
    return getattr(context["client"], method)(path, **kwargs)


def _actual_fields(response):
    body = response.get_json(silent=True)
    if isinstance(body, dict) and isinstance(body.get("entry"), dict):
        return body["entry"]
    return body if isinstance(body, dict) else {}


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["id"])
def test_case_catalog(catalog_context, case):
    response = _request(catalog_context, case)
    expected = case["expected"]
    assert response.status_code == expected["status"], (
        f"{case['id']} expected {expected['status']}, got {response.status_code}: "
        f"{response.get_data(as_text=True)}"
    )

    if "error_contains" in expected:
        body = response.get_json()
        assert expected["error_contains"].lower() in body["error"].lower()
    if "array_length" in expected:
        assert len(response.get_json()) == expected["array_length"]
    if "fields" in expected:
        fields = _actual_fields(response)
        for field, value in expected["fields"].items():
            if field == "archived":
                assert bool(fields.get("archived_at")) is value
            else:
                assert fields.get(field) == value


def test_catalog_ids_are_unique_and_prioritized():
    ids = [case["id"] for case in CASES]
    assert len(ids) == len(set(ids))
    assert all(case["priority"] in {"P0", "P1", "P2"} for case in CASES)
