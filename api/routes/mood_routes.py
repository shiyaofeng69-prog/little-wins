from datetime import date as date_type, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import HTTPException
from api.services.mood_service import MoodService
from api.utils.auth_middleware import require_auth, get_current_user_id

ALLOWED_CATEGORIES = {
    "self-care",
    "work-study",
    "health",
    "daily-life",
    "connection",
    "courage",
}
CREATE_FIELDS = {
    "mood",
    "date",
    "content",
    "time",
    "selected_options",
    "category",
    "feeling",
}
UPDATE_FIELDS = CREATE_FIELDS | {"celebrated", "archived"}


def _normalise_selected_options(
    raw: Any, *, allow_none: bool = False
) -> Optional[List[int]]:
    if raw is None:
        return None if allow_none else []

    if not isinstance(raw, list):
        raise ValueError("selected_options must be an array")

    if len(raw) > 50:
        raise ValueError("selected_options supports at most 50 items")
    values = []
    for option_id in raw:
        if not isinstance(option_id, int) or isinstance(option_id, bool) or option_id <= 0:
            raise ValueError("selected_options must contain positive integers")
        values.append(option_id)
    if len(values) != len(set(values)):
        raise ValueError("selected_options must not contain duplicates")
    return values


def create_mood_routes(mood_service: MoodService):
    mood_bp = Blueprint("mood", __name__)

    @mood_bp.route("/mood", methods=["POST"])
    @require_auth
    def create_mood_entry():
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            data = _json_object()
            unknown = set(data) - CREATE_FIELDS
            if unknown:
                return jsonify({"error": f"Unknown fields: {', '.join(sorted(unknown))}"}), 400

            missing = {field for field in ("mood", "date", "content") if field not in data}
            if missing:
                return jsonify({"error": f"Missing fields: {', '.join(sorted(missing))}"}), 400

            selected_options_raw = data.get("selected_options", [])
            mood_value = _strict_mood(data["mood"])
            date_value = _strict_date(data["date"])
            content_value = _strict_text(data["content"], "content", 800, required=True)
            time_value = _strict_time(data.get("time"))
            category = _strict_category(data.get("category"))
            feeling = None
            if data.get("feeling") is not None:
                feeling = _strict_text(data["feeling"], "feeling", 300, required=False)
            selected_options = _normalise_selected_options(selected_options_raw)

            result = mood_service.create_mood_entry(
                user_id,
                date_value,
                mood_value,
                content_value,
                time_value,
                selected_options,
                category,
                feeling,
            )

            return (
                jsonify(
                    {
                        "status": "success",
                        "entry_id": result["entry_id"],
                        "entry": result["entry"],
                        "new_achievements": result["new_achievements"],
                        "message": "Mood entry created successfully",
                    }
                ),
                201,
            )

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except HTTPException:
            raise
        except Exception:
            current_app.logger.exception("Create achievement entry failed")
            return jsonify({"error": "Internal server error"}), 500

    @mood_bp.route("/moods", methods=["GET"])
    @require_auth
    def get_mood_entries():
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")
            limit, offset = _pagination()

            if bool(start_date) != bool(end_date):
                return jsonify({"error": "start_date and end_date must be provided together"}), 400
            if start_date and end_date:
                start_date = _strict_date(start_date)
                end_date = _strict_date(end_date)
                if start_date > end_date:
                    return jsonify({"error": "start_date must not be after end_date"}), 400
                entries = mood_service.get_entries_by_date_range(
                    user_id, start_date, end_date, limit, offset
                )
            else:
                entries = mood_service.get_all_entries(user_id, limit, offset)
            return jsonify(entries)

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except HTTPException:
            raise
        except Exception:
            current_app.logger.exception("Get achievement entries failed")
            return jsonify({"error": "Internal server error"}), 500

    @mood_bp.route("/mood/<int:entry_id>", methods=["GET"])
    @require_auth
    def get_mood_entry(entry_id):
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            entry = mood_service.get_entry_by_id(user_id, entry_id)
            if entry:
                return jsonify(entry)
            else:
                return jsonify({"error": "Entry not found"}), 404

        except HTTPException:
            raise
        except Exception:
            current_app.logger.exception("Get achievement entry failed")
            return jsonify({"error": "Internal server error"}), 500

    @mood_bp.route("/mood/<int:entry_id>", methods=["PUT"])
    @require_auth
    def update_mood_entry(entry_id):
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            data = _json_object()
            unknown = set(data) - UPDATE_FIELDS
            if unknown:
                return jsonify({"error": f"Unknown fields: {', '.join(sorted(unknown))}"}), 400

            mood = data.get("mood")
            content = data.get("content")
            date = data.get("date")
            time = data.get("time")
            category = data.get("category")
            feeling = data.get("feeling")
            celebrated = data.get("celebrated")
            archived = data.get("archived")
            selected_options = None
            if "selected_options" in data:
                try:
                    normalised_options = _normalise_selected_options(
                        data.get("selected_options"), allow_none=True
                    )
                except ValueError as exc:
                    return jsonify({"error": str(exc)}), 400
                selected_options = (
                    [] if normalised_options is None else normalised_options
                )

            if (
                mood is None
                and content is None
                and date is None
                and time is None
                and category is None
                and feeling is None
                and celebrated is None
                and archived is None
                and "selected_options" not in data
            ):
                return jsonify({"error": "No update fields provided"}), 400

            mood_value = None
            if mood is not None:
                mood_value = _strict_mood(mood)

            content_value = (
                _strict_text(content, "content", 800, required=True)
                if content is not None
                else None
            )
            date_value = _strict_date(date) if date is not None else None
            time_value = _strict_time(time) if time is not None else None
            category_value = _strict_category(category) if category is not None else None
            feeling_value = (
                _strict_text(feeling, "feeling", 300, required=False)
                if feeling is not None
                else None
            )
            celebrated_value = (
                _strict_bool(celebrated, "celebrated")
                if celebrated is not None
                else None
            )
            archived_value = (
                _strict_bool(archived, "archived")
                if archived is not None
                else None
            )

            updated_entry = mood_service.update_entry(
                user_id,
                entry_id,
                mood=mood_value,
                content=content_value,
                date=date_value,
                time=time_value,
                selected_options=selected_options,
                category=category_value,
                feeling=feeling_value,
                celebrated=celebrated_value,
                archived=archived_value,
            )

            if updated_entry is None:
                return jsonify({"error": "Entry not found or no changes made"}), 404

            return (
                jsonify(
                    {
                        "status": "success",
                        "message": "Mood entry updated successfully",
                        "entry": updated_entry,
                    }
                ),
                200,
            )

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except HTTPException:
            raise
        except Exception:
            current_app.logger.exception("Update achievement entry failed")
            return jsonify({"error": "Internal server error"}), 500

    @mood_bp.route("/mood/<int:entry_id>", methods=["DELETE"])
    @require_auth
    def delete_mood_entry(entry_id):
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            success = mood_service.delete_entry(user_id, entry_id)

            if success:
                return jsonify(
                    {"status": "success", "message": "Mood entry deleted successfully"}
                )
            else:
                return jsonify({"error": "Entry not found"}), 404

        except Exception:
            current_app.logger.exception("Delete achievement entry failed")
            return jsonify({"error": "Internal server error"}), 500

    @mood_bp.route("/statistics", methods=["GET"])
    @require_auth
    def get_mood_statistics():
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            stats = mood_service.get_statistics(user_id)
            return jsonify(stats)

        except Exception:
            current_app.logger.exception("Get achievement statistics failed")
            return jsonify({"error": "Internal server error"}), 500

    @mood_bp.route("/streak", methods=["GET"])
    @require_auth
    def get_current_streak():
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            streak = mood_service.get_current_streak(user_id)
            return jsonify(
                {
                    "current_streak": streak,
                    "message": f'Current streak: {streak} day{"s" if streak != 1 else ""}',
                }
            )

        except Exception:
            current_app.logger.exception("Get achievement streak failed")
            return jsonify({"error": "Internal server error"}), 500

    @mood_bp.route("/mood/<int:entry_id>/selections", methods=["GET"])
    @require_auth
    def get_entry_selections(entry_id):
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            selections = mood_service.get_entry_selections(user_id, entry_id)
            return jsonify(selections)

        except Exception:
            current_app.logger.exception("Get achievement selections failed")
            return jsonify({"error": "Internal server error"}), 500

    return mood_bp


def _json_object() -> Dict[str, Any]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValueError("JSON object required")
    return data


def _strict_mood(raw: Any) -> int:
    if not isinstance(raw, int) or isinstance(raw, bool) or not 1 <= raw <= 5:
        raise ValueError("Mood must be an integer between 1 and 5")
    return raw


def _strict_text(raw: Any, field: str, max_length: int, *, required: bool) -> str:
    if not isinstance(raw, str):
        raise ValueError(f"{field} must be a string")
    value = raw.strip()
    if required and not value:
        raise ValueError(f"{field} cannot be empty")
    if len(value) > max_length:
        raise ValueError(f"{field} must be {max_length} characters or fewer")
    return value


def _strict_date(raw: Any) -> str:
    if not isinstance(raw, str):
        raise ValueError("date must be an ISO date string")
    try:
        parsed = date_type.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError("date must use YYYY-MM-DD") from exc
    if parsed.year < 2000 or parsed > date_type.today() + timedelta(days=1):
        raise ValueError("date is outside the allowed range")
    return parsed.isoformat()


def _strict_time(raw: Any) -> Optional[str]:
    if raw is None:
        return None
    if not isinstance(raw, str):
        raise ValueError("time must be an RFC3339 string")
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("time must be a valid RFC3339 timestamp") from exc
    if parsed.tzinfo is None:
        raise ValueError("time must include a timezone")
    if parsed.astimezone(timezone.utc) > datetime.now(timezone.utc) + timedelta(minutes=10):
        raise ValueError("time cannot be in the future")
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _strict_category(raw: Any) -> Optional[str]:
    if raw is None or raw == "":
        return None
    if not isinstance(raw, str) or raw not in ALLOWED_CATEGORIES:
        raise ValueError("category is invalid")
    return raw


def _strict_bool(raw: Any, field: str) -> bool:
    if not isinstance(raw, bool):
        raise ValueError(f"{field} must be a boolean")
    return raw


def _pagination() -> tuple[int, int]:
    try:
        limit = int(request.args.get("limit", 200))
        offset = int(request.args.get("offset", 0))
    except (TypeError, ValueError) as exc:
        raise ValueError("limit and offset must be integers") from exc
    if not 1 <= limit <= 500 or not 0 <= offset <= 1_000_000:
        raise ValueError("limit must be 1..500 and offset must be 0..1000000")
    return limit, offset
