#!/usr/bin/env python3
"""Create, verify, and restore an explicit Little Wins SQLite backup."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile
import time

CORE_TABLES = ("users", "mood_entries", "entry_selections")


def _resolved(path: str | Path) -> Path:
    return Path(path).expanduser().resolve()


def _integrity(path: Path) -> None:
    if not path.is_file():
        raise ValueError(f"Database does not exist: {path}")
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as connection:
        result = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if result != "ok":
            raise ValueError(f"SQLite integrity check failed: {result}")


def database_manifest(path: str | Path) -> dict:
    database = _resolved(path)
    _integrity(database)
    counts: dict[str, int] = {}
    digest = hashlib.sha256()
    with sqlite3.connect(f"file:{database}?mode=ro", uri=True) as connection:
        for table in CORE_TABLES:
            exists = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
            ).fetchone()
            if not exists:
                counts[table] = 0
                continue
            rows = connection.execute(f'SELECT * FROM "{table}" ORDER BY rowid').fetchall()
            counts[table] = len(rows)
            for row in rows:
                digest.update(json.dumps(row, ensure_ascii=False, default=str).encode())
    return {"database": str(database), "counts": counts, "sha256": digest.hexdigest()}


def backup_database(source: str | Path, destination: str | Path) -> dict:
    started = time.perf_counter()
    source_path, destination_path = _resolved(source), _resolved(destination)
    if source_path == destination_path:
        raise ValueError("Source and backup paths must be different")
    _integrity(source_path)
    if destination_path.exists():
        raise ValueError("Backup destination already exists")
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(f"file:{source_path}?mode=ro", uri=True) as source_db:
        with sqlite3.connect(destination_path) as backup_db:
            source_db.backup(backup_db)
    result = database_manifest(destination_path)
    result.update({"operation": "backup", "elapsed_ms": round((time.perf_counter() - started) * 1000, 2)})
    return result


def restore_database(
    backup: str | Path, destination: str | Path, *, replace: bool = False
) -> dict:
    started = time.perf_counter()
    backup_path, destination_path = _resolved(backup), _resolved(destination)
    if backup_path == destination_path:
        raise ValueError("Backup and restore paths must be different")
    _integrity(backup_path)
    if destination_path.exists() and not replace:
        raise ValueError("Restore destination exists; pass --replace explicitly")
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        prefix="little-wins-restore-", suffix=".db", dir=destination_path.parent, delete=False
    ) as temporary:
        temporary_path = Path(temporary.name)
    try:
        with sqlite3.connect(f"file:{backup_path}?mode=ro", uri=True) as backup_db:
            with sqlite3.connect(temporary_path) as restored_db:
                backup_db.backup(restored_db)
        _integrity(temporary_path)
        temporary_path.replace(destination_path)
    finally:
        temporary_path.unlink(missing_ok=True)
    result = database_manifest(destination_path)
    result.update({"operation": "restore", "elapsed_ms": round((time.perf_counter() - started) * 1000, 2)})
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    backup_parser = subparsers.add_parser("backup")
    backup_parser.add_argument("--source", required=True)
    backup_parser.add_argument("--destination", required=True)
    restore_parser = subparsers.add_parser("restore")
    restore_parser.add_argument("--backup", required=True)
    restore_parser.add_argument("--destination", required=True)
    restore_parser.add_argument("--replace", action="store_true")
    verify_parser = subparsers.add_parser("verify")
    verify_parser.add_argument("--database", required=True)
    args = parser.parse_args()

    if args.command == "backup":
        result = backup_database(args.source, args.destination)
    elif args.command == "restore":
        result = restore_database(args.backup, args.destination, replace=args.replace)
    else:
        result = database_manifest(args.database)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
