from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import HTTPException
import os
import requests
import hmac
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from api.services.user_service import UserService
from api.utils.rate_limiter import rate_limit
from api.utils.auth_middleware import decode_access_token, get_current_user_id, require_auth
from api.config import get_config


def create_auth_routes(user_service: UserService):
    auth_bp = Blueprint("auth", __name__)

    @auth_bp.route("/auth/google", methods=["POST"])
    @rate_limit(max_requests=10, window_minutes=1)
    def google_auth():
        """Handle Google OAuth token verification"""
        try:
            cfg = get_config()
            if not cfg.ENABLE_GOOGLE_OAUTH:
                return jsonify({"error": "Google login is disabled"}), 404

            data = request.get_json(silent=True)
            if not isinstance(data, dict):
                return jsonify({"error": "JSON object required"}), 400
            if set(data) != {"token"}:
                return jsonify({"error": "Only token is accepted"}), 400
            google_token = data.get("token")

            if not isinstance(google_token, str) or not google_token.strip():
                return jsonify({"error": "Google token is required"}), 400
            if len(google_token) > 8192:
                return jsonify({"error": "Google token is too long"}), 400

            # Verify Google token
            google_user_info = verify_google_token(google_token)
            if not google_user_info:
                return jsonify({"error": "Invalid Google token"}), 401

            # Get or create user
            user = user_service.get_or_create_user(
                google_id=google_user_info["sub"],
                email=google_user_info["email"],
                name=google_user_info.get("name") or google_user_info["email"],
                avatar_url=google_user_info.get("picture"),
            )

            # Generate JWT token
            jwt_token = generate_jwt_token(
                user["id"], user.get("session_version", 0)
            )

            return jsonify(
                {
                    "token": jwt_token,
                    "user": {
                        "id": user["id"],
                        "name": user["name"],
                        "email": user["email"],
                        "avatar_url": user["avatar_url"],
                    },
                }
            )

        except HTTPException:
            raise
        except Exception as e:
            current_app.logger.error(f"Google auth error: {str(e)}")
            return jsonify({"error": "Authentication failed"}), 500

    @auth_bp.route("/auth/verify", methods=["POST"])
    @rate_limit(max_requests=60, window_minutes=1)
    def verify_token():
        """Verify JWT token and return user info"""
        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "Authorization header required"}), 401

            token = auth_header[7:].strip()
            if not token or len(token) > 8192:
                return jsonify({"error": "Invalid token"}), 401
            payload = decode_access_token(token)

            user_id = payload.get("user_id")
            if not isinstance(user_id, int) or isinstance(user_id, bool) or user_id <= 0:
                return jsonify({"error": "Invalid token"}), 401

            user = user_service.get_user_by_id(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404
            if payload.get("session_version", 0) != user.get("session_version", 0):
                return jsonify({"error": "Invalid token"}), 401

            return jsonify(
                {
                    "user": {
                        "id": user["id"],
                        "name": user["name"],
                        "email": user["email"],
                        "avatar_url": user["avatar_url"],
                    }
                }
            )

        except (JWTError, ValueError) as e:
            if "expired" in str(e).lower():
                return jsonify({"error": "Token expired"}), 401
            else:
                return jsonify({"error": "Invalid token"}), 401
        except HTTPException:
            raise
        except Exception as e:
            current_app.logger.error(f"Token verification error: {str(e)}")
            return jsonify({"error": "Token verification failed"}), 500

    @auth_bp.route("/auth/local/login", methods=["POST"])
    @rate_limit(max_requests=10, window_minutes=1)
    def local_login():
        """Local self-host login: ensure a single default user and issue JWT."""
        try:
            cfg = get_config()
            data = request.get_json(silent=True)
            if data is None:
                data = {}
            elif not isinstance(data, dict):
                return jsonify({"error": "JSON object required"}), 400
            if set(data) - {"password"}:
                return jsonify({"error": "Only password is accepted"}), 400

            provided_password = data.get("password")
            if provided_password is not None and not isinstance(provided_password, str):
                return jsonify({"error": "Password must be a string"}), 400
            if isinstance(provided_password, str) and len(provided_password) > 1024:
                return jsonify({"error": "Password is too long"}), 400

            if cfg.LOCAL_ACCESS_PASSWORD:
                if not provided_password or not hmac.compare_digest(
                    provided_password, cfg.LOCAL_ACCESS_PASSWORD
                ):
                    return jsonify({"error": "Invalid local access password"}), 401
            elif (
                not cfg.ALLOW_PASSWORDLESS_LOCAL_LOGIN
                and not current_app.config.get("TESTING")
                and not current_app.debug
            ):
                return jsonify({"error": "Local login is not configured"}), 403

            default_user_id = cfg.DEFAULT_SELF_HOST_ID

            # Use friendlier display for the self-hosted user
            default_name = os.getenv("SELFHOST_USER_NAME") or "Me"
            default_email = (
                os.getenv("SELFHOST_USER_EMAIL") or f"{default_user_id}@localhost"
            )

            user = user_service.ensure_local_user(
                default_user_id, default_name, default_email
            )

            # Prefer typed JWT secret; fallback to legacy config
            jwt_secret = cfg.JWT_SECRET or current_app.config.get("JWT_SECRET_KEY")
            if not jwt_secret:
                return jsonify({"error": "JWT not configured"}), 500

            from jose import jwt as jose_jwt
            from datetime import datetime, timedelta

            payload = {
                "user_id": user["id"],
                "session_version": user.get("session_version", 0),
                "exp": datetime.now(timezone.utc)
                + timedelta(seconds=current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]),
                "iat": datetime.now(timezone.utc),
            }

            token = jose_jwt.encode(payload, jwt_secret, algorithm="HS256")

            return (
                jsonify(
                    {
                        "token": token,
                        "user": {
                            "id": user["id"],
                            "name": user["name"],
                            "email": user.get("email"),
                            "avatar_url": user.get("avatar_url"),
                        },
                    }
                ),
                200,
            )
        except HTTPException:
            raise
        except Exception as e:
            current_app.logger.error(f"Local login error: {e}")
            return jsonify({"error": "Authentication failed"}), 500

    @auth_bp.route("/auth/logout", methods=["POST"])
    @require_auth
    def logout():
        """Revoke tokens issued for the current account before logging out."""
        user_id = get_current_user_id()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401
        if not user_service.revoke_sessions(user_id):
            return jsonify({"error": "User not found"}), 404
        return jsonify({"status": "success"}), 200

    def verify_google_token(token: str) -> dict:
        """Verify Google OAuth token and return user info"""
        try:
            # Verify token with Google
            response = requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": token},
                timeout=10,
            )

            if response.status_code != 200:
                current_app.logger.error(
                    f"Google token verification failed with status {response.status_code}"
                )
                return None

            user_info = response.json()
            # Verify the token is for our app
            expected_client_id = current_app.config["GOOGLE_CLIENT_ID"]
            actual_client_id = user_info.get("aud")

            if actual_client_id != expected_client_id:
                current_app.logger.error(
                    f"Client ID mismatch: expected {expected_client_id}, got {actual_client_id}"
                )
                return None

            if not user_info.get("sub") or not user_info.get("email"):
                return None
            if str(user_info.get("email_verified", "false")).lower() != "true":
                return None

            return user_info

        except Exception as e:
            current_app.logger.error(f"Google token verification error: {str(e)}")
            return None

    def generate_jwt_token(user_id: int, session_version: int = 0) -> str:
        """Generate JWT token for user"""
        payload = {
            "user_id": user_id,
            "session_version": session_version,
            "exp": datetime.now(timezone.utc)
            + timedelta(seconds=current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]),
            "iat": datetime.now(timezone.utc),
        }

        return jwt.encode(
            payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256"
        )

    return auth_bp
