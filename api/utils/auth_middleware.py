from functools import wraps
from datetime import datetime, timezone
from flask import request, jsonify, current_app, g
from jose import jwt, JWTError


def decode_access_token(token: str):
    """Decode an access token and enforce the claims every route relies on."""
    payload = jwt.decode(
        token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"]
    )
    user_id = payload.get("user_id")
    issued_at = payload.get("iat")
    expires_at = payload.get("exp")
    if (
        not isinstance(user_id, int)
        or isinstance(user_id, bool)
        or user_id <= 0
        or not isinstance(issued_at, (int, float))
        or isinstance(issued_at, bool)
        or not isinstance(expires_at, (int, float))
        or isinstance(expires_at, bool)
    ):
        raise ValueError("Required token claims are missing or invalid")
    if issued_at > datetime.now(timezone.utc).timestamp() + 60:
        raise ValueError("Token issue time is in the future")
    return payload


def require_auth(f):
    """Decorator to require JWT authentication"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Allow CORS preflight requests (OPTIONS) to succeed without auth
        # Return 204 directly so the route handler isn't invoked.
        if request.method == "OPTIONS":
            return ("", 204)
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization header required"}), 401

        try:
            token = auth_header[7:].strip()
            if not token or len(token) > 8192:
                return jsonify({"error": "Invalid token"}), 401
            payload = decode_access_token(token)

            # Store user_id in Flask's g object for use in the route
            user_id = payload.get("user_id")
            user_service = current_app.extensions.get("user_service")
            if user_service is None or user_service.get_user_by_id(user_id) is None:
                return jsonify({"error": "Invalid token"}), 401
            g.user_id = user_id

        except (JWTError, ValueError) as e:
            if "expired" in str(e).lower():
                return jsonify({"error": "Token expired"}), 401
            else:
                return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            current_app.logger.error(f"Auth middleware error: {str(e)}")
            return jsonify({"error": "Authentication failed"}), 500

        return f(*args, **kwargs)

    return decorated_function


def get_current_user_id():
    """Get current authenticated user ID from Flask g object"""
    return getattr(g, "user_id", None)
