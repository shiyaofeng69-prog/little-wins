from api.config import get_config, config_to_public_dict


def test_public_config_shape():
    cfg = get_config()
    public = config_to_public_dict(cfg)
    assert set(public.keys()) == {
        "enable_google_oauth",
        "enable_email_auth",
        "enable_mood_music",
        "google_client_id",
        "local_login_requires_password",
        "passwordless_local_login",
    }
    assert isinstance(public["enable_google_oauth"], bool)
    assert isinstance(public["enable_mood_music"], bool)
    assert isinstance(public["local_login_requires_password"], bool)
    assert isinstance(public["passwordless_local_login"], bool)
    # Only google oauth remains


def test_public_config_default_values():
    cfg = get_config()
    public = config_to_public_dict(cfg)
    assert public["enable_google_oauth"] in (True, False)
    assert public["enable_mood_music"] in (True, False)
    # Web3 flag removed
