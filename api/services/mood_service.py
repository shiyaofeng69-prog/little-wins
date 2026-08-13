import sqlite3
from typing import List, Optional, Dict
from api.database import MoodDatabase
from api.models.mood_entry import MoodEntry


class IdempotencyConflict(ValueError):
    """Raised when a key is reused for a different create request."""


class MoodService:
    def __init__(self, db: MoodDatabase):
        self.db = db

    def create_mood_entry(
        self,
        user_id: int,
        date: str,
        mood: int,
        content: str,
        time: Optional[str] = None,
        selected_options: Optional[List[int]] = None,
        category: Optional[str] = None,
        feeling: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        idempotency_fingerprint: Optional[str] = None,
    ) -> Dict:
        """Create a new mood entry and check for achievements"""
        if not (1 <= mood <= 5):
            raise ValueError("Mood must be between 1 and 5")

        if not content.strip():
            raise ValueError("Content cannot be empty")
        if len(content) > 800:
            raise ValueError("Content must be 800 characters or fewer")
        if feeling is not None and len(feeling) > 300:
            raise ValueError("Feeling must be 300 characters or fewer")
        if selected_options and not self.db.group_options_exist(selected_options):
            raise ValueError("One or more selected options do not exist")

        if idempotency_key:
            existing = self.db.get_mood_entry_by_idempotency_key(
                user_id, idempotency_key
            )
            if existing:
                if existing.pop("idempotency_fingerprint", None) != idempotency_fingerprint:
                    raise IdempotencyConflict(
                        "Idempotency key was already used for different content"
                    )
                return {
                    "entry_id": existing["id"],
                    "entry": existing,
                    "new_achievements": [],
                    "created": False,
                }

        try:
            entry_id = self.db.add_mood_entry(
                user_id,
                date,
                mood,
                content,
                time,
                selected_options,
                category,
                feeling,
                idempotency_key,
                idempotency_fingerprint,
            )
        except sqlite3.IntegrityError:
            existing = (
                self.db.get_mood_entry_by_idempotency_key(user_id, idempotency_key)
                if idempotency_key
                else None
            )
            if not existing:
                raise
            if existing.pop("idempotency_fingerprint", None) != idempotency_fingerprint:
                raise IdempotencyConflict(
                    "Idempotency key was already used for different content"
                )
            return {
                "entry_id": existing["id"],
                "entry": existing,
                "new_achievements": [],
                "created": False,
            }

        # Check for new achievements
        new_achievements = self.db.check_achievements(user_id)

        return {
            "entry_id": entry_id,
            "entry": self.db.get_mood_entry_by_id(user_id, entry_id),
            "new_achievements": new_achievements,
            "created": True,
        }

    def get_all_entries(
        self, user_id: int, limit: int = 200, offset: int = 0
    ) -> List[Dict]:
        """Get all mood entries for a user"""
        return self.db.get_all_mood_entries(user_id, limit, offset)

    def get_entries_by_date_range(
        self,
        user_id: int,
        start_date: str,
        end_date: str,
        limit: int = 200,
        offset: int = 0,
    ) -> List[Dict]:
        """Get mood entries within a date range for a user"""
        return self.db.get_mood_entries_by_date_range(
            user_id, start_date, end_date, limit, offset
        )

    def get_entry_by_id(self, user_id: int, entry_id: int) -> Optional[Dict]:
        """Get a specific mood entry by ID for a user"""
        return self.db.get_mood_entry_by_id(user_id, entry_id)

    def update_entry(
        self,
        user_id: int,
        entry_id: int,
        mood: Optional[int] = None,
        content: Optional[str] = None,
        date: Optional[str] = None,
        time: Optional[str] = None,
        selected_options: Optional[List[int]] = None,
        category: Optional[str] = None,
        feeling: Optional[str] = None,
        celebrated: Optional[bool] = None,
        archived: Optional[bool] = None,
    ) -> Optional[Dict]:
        """Update an existing mood entry for a user and return the updated record"""
        if mood is not None and not (1 <= mood <= 5):
            raise ValueError("Mood must be between 1 and 5")

        if content is not None and not content.strip():
            raise ValueError("Content cannot be empty")
        if content is not None and len(content) > 800:
            raise ValueError("Content must be 800 characters or fewer")
        if feeling is not None and len(feeling) > 300:
            raise ValueError("Feeling must be 300 characters or fewer")
        if selected_options and not self.db.group_options_exist(selected_options):
            raise ValueError("One or more selected options do not exist")

        updated = self.db.update_mood_entry(
            user_id,
            entry_id,
            mood=mood,
            content=content,
            date=date,
            time=time,
            selected_options=selected_options,
            category=category,
            feeling=feeling,
            celebrated=celebrated,
            archived=archived,
        )

        if not updated:
            return None

        entry = self.db.get_mood_entry_by_id(user_id, entry_id)
        if not entry:
            return None

        selections = self.db.get_entry_selections(entry_id)
        entry["selections"] = selections
        return entry

    def delete_entry(self, user_id: int, entry_id: int) -> bool:
        """Delete a mood entry for a user"""
        return self.db.delete_mood_entry(user_id, entry_id)

    def get_statistics(self, user_id: int) -> Dict:
        """Get mood statistics for a user"""
        # Track statistics view for achievements (Data Lover)
        try:
            self.db.increment_stats_view(user_id)
        except Exception:
            # Metrics should not break stats
            pass
        stats = self.db.get_mood_statistics(user_id)
        mood_counts = self.db.get_mood_counts(user_id)
        current_streak = self.db.get_current_streak(user_id)

        return {
            "statistics": stats,
            "mood_distribution": mood_counts,
            "current_streak": current_streak,
        }

    def get_current_streak(self, user_id: int) -> int:
        """Get current consecutive days streak for a user"""
        return self.db.get_current_streak(user_id)

    def get_entry_selections(self, user_id: int, entry_id: int) -> List[Dict]:
        """Get selected options for an entry (with user verification)"""
        # First verify the entry belongs to the user
        entry = self.db.get_mood_entry_by_id(user_id, entry_id)
        if not entry:
            return []
        return self.db.get_entry_selections(entry_id)
