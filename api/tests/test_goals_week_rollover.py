"""Regression guard for retired Nightlio product surfaces."""

from api.app import create_app


def test_goal_routes_are_retired_from_little_wins():
    app = create_app("testing")
    client = app.test_client()
    assert client.get("/api/goals").status_code == 404
