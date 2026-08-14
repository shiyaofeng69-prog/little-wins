from api.app import create_app


def test_config_endpoint_client():
    app = create_app("testing")
    client = app.test_client()
    resp = client.get("/api/config")
    assert resp.status_code == 200
    data = resp.get_json()
    assert set(data.keys()) == {
        "enable_google_oauth",
        "enable_email_auth",
        "enable_mood_music",
        "google_client_id",
        "local_login_enabled",
        "local_login_requires_password",
        "passwordless_local_login",
    }
    assert isinstance(data["enable_google_oauth"], bool)
    assert isinstance(data["enable_mood_music"], bool)
    assert data["local_login_enabled"] is True
