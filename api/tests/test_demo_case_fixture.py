import json
from datetime import date, datetime
from pathlib import Path
import sqlite3

from scripts.seed_little_wins_cases import seed_cases


FIXTURE = (
    Path(__file__).resolve().parents[2]
    / "examples"
    / "little_wins_demo_cases.json"
)


def test_demo_fixture_covers_product_categories_and_states():
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    entries = data["entries"]
    assert len(entries) >= 18
    assert {entry["category"] for entry in entries} == {
        "self-care",
        "work-study",
        "health",
        "daily-life",
        "connection",
        "courage",
    }
    assert any(entry["archived"] for entry in entries)
    assert any(entry["celebrated"] for entry in entries)
    assert any("\n" in entry["content"] for entry in entries)
    assert any(any(ord(char) > 0xFFFF for char in entry["content"]) for entry in entries)
    assert max(entry["days_ago"] for entry in entries) >= 365


def test_demo_seed_is_idempotent_and_scoped(tmp_path):
    database = tmp_path / "demo-cases.db"
    first = seed_cases(str(database), today=None)
    second = seed_cases(str(database), today=None)
    assert first["created"] == first["total_fixture_entries"]
    assert second["created"] == 0
    assert second["skipped"] == first["total_fixture_entries"]

    with sqlite3.connect(database) as connection:
        count = connection.execute(
            "SELECT COUNT(*) FROM mood_entries WHERE user_id = ?",
            (first["user_id"],),
        ).fetchone()[0]
    assert count == first["total_fixture_entries"]


def test_demo_seed_preserves_fixture_day_in_local_time(tmp_path):
    database = tmp_path / "demo-local-time.db"
    anchor = date(2026, 8, 13)
    result = seed_cases(str(database), today=anchor)

    with sqlite3.connect(database) as connection:
        created_at, entry_date = connection.execute(
            """
            SELECT created_at, date FROM mood_entries
             WHERE user_id = ? AND content = '今天按时起床了'
            """,
            (result["user_id"],),
        ).fetchone()

    rendered_local = datetime.fromisoformat(created_at.replace("Z", "+00:00")).astimezone()
    assert entry_date == anchor.isoformat()
    assert rendered_local.date() == anchor
    assert (rendered_local.hour, rendered_local.minute) == (8, 5)
