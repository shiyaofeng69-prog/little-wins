"""In-process smoke tests; no separately running API is required."""

from api.app import create_app


def test_core_api_smoke():
    app = create_app("testing")
    client = app.test_client()

    health = client.get("/api/")
    assert health.status_code == 200
    assert health.get_json()["status"] == "healthy"

    login = client.post("/api/auth/local/login", json={})
    assert login.status_code == 200
    token = login.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    moods = client.get("/api/moods", headers=headers)
    assert moods.status_code == 200
    assert isinstance(moods.get_json(), list)


def test_legacy_product_routes_are_not_public_by_default():
    app = create_app("testing")
    client = app.test_client()
    for path in ("/api/groups", "/api/goals", "/api/achievements"):
        assert client.get(path).status_code == 404
