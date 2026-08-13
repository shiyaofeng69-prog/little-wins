import sqlite3

import pytest

from scripts.backup_restore import backup_database, database_manifest, restore_database
from scripts.seed_little_wins_cases import seed_cases


def test_backup_restore_preserves_core_data_and_states(tmp_path):
    source = tmp_path / "source.db"
    backup = tmp_path / "backup.db"
    restored = tmp_path / "restored.db"
    seed_cases(str(source), replace=True)

    source_manifest = database_manifest(source)
    backup_manifest = backup_database(source, backup)
    restored_manifest = restore_database(backup, restored)

    assert backup_manifest["counts"] == source_manifest["counts"]
    assert restored_manifest["counts"] == source_manifest["counts"]
    assert restored_manifest["sha256"] == source_manifest["sha256"]
    with sqlite3.connect(restored) as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM mood_entries WHERE celebrated = 1"
        ).fetchone()[0] > 0
        assert connection.execute(
            "SELECT COUNT(*) FROM mood_entries WHERE archived_at IS NOT NULL"
        ).fetchone()[0] > 0


def test_backup_and_restore_require_safe_explicit_paths(tmp_path):
    source = tmp_path / "source.db"
    backup = tmp_path / "backup.db"
    restored = tmp_path / "restored.db"
    seed_cases(str(source))
    backup_database(source, backup)
    restored.write_text("do not overwrite", encoding="utf-8")

    with pytest.raises(ValueError, match="already exists"):
        backup_database(source, backup)
    with pytest.raises(ValueError, match="--replace"):
        restore_database(backup, restored)

    restored_manifest = restore_database(backup, restored, replace=True)
    assert restored_manifest["counts"]["mood_entries"] == 18
