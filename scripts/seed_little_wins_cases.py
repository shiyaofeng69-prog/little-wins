#!/usr/bin/env python3
"""Seed a dedicated Little Wins QA user from the reusable demo fixture."""

from __future__ import annotations

import argparse
from datetime import date, datetime, time, timedelta, timezone
import json
from pathlib import Path
import sqlite3
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.database import MoodDatabase  # noqa: E402

DEFAULT_FIXTURE = PROJECT_ROOT / "examples" / "little_wins_demo_cases.json"


def seed_cases(
    database_path: str,
    fixture_path: str | Path = DEFAULT_FIXTURE,
    *,
    replace: bool = False,
    today: date | None = None,
) -> dict:
    fixture = json.loads(Path(fixture_path).read_text(encoding="utf-8"))
    db = MoodDatabase(database_path)
    user_spec = fixture["user"]
    user = db.upsert_user_by_google_id(
        user_spec["google_id"],
        user_spec["email"],
        user_spec["name"],
    )
    if not user:
        raise RuntimeError("Could not create the QA user")

    if replace:
        with sqlite3.connect(database_path) as connection:
            connection.execute(
                "DELETE FROM mood_entries WHERE user_id = ?", (user["id"],)
            )
            connection.commit()

    anchor = today or date.today()
    local_timezone = datetime.now().astimezone().tzinfo
    created = 0
    skipped = 0
    for item in fixture["entries"]:
        entry_date = anchor - timedelta(days=int(item["days_ago"]))
        # Fixture times describe the user's local morning, while the API stores
        # timestamps in UTC. Converting explicitly prevents an 08:05 example
        # from appearing as a future 16:05 entry in UTC+8 browsers.
        created_at = datetime.combine(
            entry_date,
            time(hour=8, minute=0),
            tzinfo=local_timezone,
        ) + timedelta(minutes=int(item.get("minute", 0)))
        created_at = created_at.astimezone(timezone.utc)

        with sqlite3.connect(database_path) as connection:
            existing = connection.execute(
                """
                SELECT id FROM mood_entries
                 WHERE user_id = ? AND date = ? AND content = ?
                """,
                (user["id"], entry_date.isoformat(), item["content"]),
            ).fetchone()
        if existing:
            skipped += 1
            continue

        entry_id = db.add_mood_entry(
            user_id=user["id"],
            date=entry_date.isoformat(),
            mood=int(item["mood"]),
            content=item["content"],
            time=created_at.isoformat().replace("+00:00", "Z"),
            category=item["category"],
            feeling=item.get("feeling") or None,
        )
        if item.get("celebrated") or item.get("archived"):
            db.update_mood_entry(
                user["id"],
                entry_id,
                celebrated=bool(item.get("celebrated")),
                archived=bool(item.get("archived")),
            )
        created += 1

    return {
        "database": database_path,
        "user_id": user["id"],
        "created": created,
        "skipped": skipped,
        "total_fixture_entries": len(fixture["entries"]),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        required=True,
        help="Explicit SQLite path. Use a disposable database for QA.",
    )
    parser.add_argument("--fixture", default=str(DEFAULT_FIXTURE))
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete only this fixture user's existing records before seeding.",
    )
    args = parser.parse_args()
    result = seed_cases(args.database, args.fixture, replace=args.replace)
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
