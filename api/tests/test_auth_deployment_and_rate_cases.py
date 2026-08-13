"""Security cases that need dedicated app configuration rather than the catalog."""

import os

import pytest

from api import config as config_module
from api.app import create_app
from api.utils.rate_limiter import request_counts


@pytest.fixture(autouse=True)
def reset_runtime_state():
    config_module._CONFIG_SINGLETON = None
    request_counts.clear()
    yield
    config_module._CONFIG_SINGLETON = None
    request_counts.clear()


def test_local_password_rejects_missing_wrong_and_unknown_fields(monkeypatch):
    monkeypatch.setenv("LOCAL_ACCESS_PASSWORD", "a-safe-local-password")
    app = create_app("testing")
    client = app.test_client()

    assert client.post("/api/auth/local/login", json={}).status_code == 401
    assert (
        client.post(
            "/api/auth/local/login", json={"password": "wrong-password"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/local/login",
            json={"password": "a-safe-local-password", "role": "admin"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/auth/local/login", json={"password": "a-safe-local-password"}
        ).status_code
        == 200
    )


def _development_client(monkeypatch, tmp_path):
    monkeypatch.setenv("ALLOW_PASSWORDLESS_LOCAL_LOGIN", "1")
    monkeypatch.delenv("LOCAL_ACCESS_PASSWORD", raising=False)
    monkeypatch.setattr(
        config_module.DevelopmentConfig,
        "DATABASE_PATH",
        str(tmp_path / "rate-limit.db"),
    )
    config_module._CONFIG_SINGLETON = None
    app = create_app("development")
    return app.test_client()


def test_login_rate_limit_ignores_spoofed_forwarded_for(monkeypatch, tmp_path):
    client = _development_client(monkeypatch, tmp_path)
    for index in range(10):
        response = client.post(
            "/api/auth/local/login",
            json={},
            headers={"X-Forwarded-For": f"203.0.113.{index}"},
        )
        assert response.status_code == 200

    limited = client.post(
        "/api/auth/local/login",
        json={},
        headers={"X-Forwarded-For": "198.51.100.99"},
    )
    assert limited.status_code == 429


def test_rate_limit_buckets_are_isolated_by_endpoint(monkeypatch, tmp_path):
    client = _development_client(monkeypatch, tmp_path)
    for _ in range(10):
        assert client.post("/api/auth/local/login", json={}).status_code == 200

    verify = client.post(
        "/api/auth/verify", headers={"Authorization": "Bearer malformed"}
    )
    assert verify.status_code == 401


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "http://little-wins.example",
        "https://localhost",
        "https://127.0.0.1",
        "https://little-wins.example/app",
        "https://little-wins.example?source=test",
        "https://user@little-wins.example",
    ],
)
def test_production_rejects_invalid_cors_origins(monkeypatch, tmp_path, origin):
    monkeypatch.setenv("JWT_SECRET", "a-unique-production-jwt-secret-1234567890")
    monkeypatch.setenv("LOCAL_ACCESS_PASSWORD", "a-safe-local-password")
    monkeypatch.setenv("ALLOW_PASSWORDLESS_LOCAL_LOGIN", "0")
    monkeypatch.setattr(config_module.ProductionConfig, "CORS_ORIGINS", [origin])
    monkeypatch.setattr(
        config_module.ProductionConfig,
        "DATABASE_PATH",
        str(tmp_path / "production.db"),
    )

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        create_app("production")


def test_production_accepts_complete_secure_configuration(monkeypatch, tmp_path):
    monkeypatch.setenv("JWT_SECRET", "a-unique-production-jwt-secret-1234567890")
    monkeypatch.setenv("LOCAL_ACCESS_PASSWORD", "a-safe-local-password")
    monkeypatch.setenv("ALLOW_PASSWORDLESS_LOCAL_LOGIN", "0")
    monkeypatch.setattr(
        config_module.ProductionConfig,
        "CORS_ORIGINS",
        ["https://little-wins.example"],
    )
    monkeypatch.setattr(
        config_module.ProductionConfig,
        "DATABASE_PATH",
        str(tmp_path / "production.db"),
    )

    app = create_app("production")
    assert app.test_client().get("/api/").status_code == 200


def test_proxy_hop_count_is_capped(monkeypatch):
    monkeypatch.setenv("TRUST_PROXY_HOPS", "999")
    config_module._CONFIG_SINGLETON = None
    assert config_module.get_config().TRUST_PROXY_HOPS == 10
