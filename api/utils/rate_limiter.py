from functools import wraps
from flask import request, jsonify, current_app
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import threading

# Simple in-memory rate limiter (for production, use Redis)
request_counts = defaultdict(list)
lock = threading.Lock()


def rate_limit(max_requests=100, window_minutes=15):
    """Rate limiting decorator"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if current_app.config.get("TESTING"):
                return f(*args, **kwargs)

            # ProxyFix, when explicitly configured, resolves the trusted proxy
            # hop. Never trust a caller-supplied X-Forwarded-For value here.
            client_ip = request.remote_addr or "unknown"
            limiter_key = (request.endpoint or f.__name__, client_ip)
            now = datetime.now(timezone.utc)
            window_start = now - timedelta(minutes=window_minutes)

            with lock:
                # Clean old requests
                request_counts[limiter_key] = [
                    req_time
                    for req_time in request_counts[limiter_key]
                    if req_time > window_start
                ]

                # Check rate limit
                if len(request_counts[limiter_key]) >= max_requests:
                    return (
                        jsonify(
                            {"error": "Rate limit exceeded. Please try again later."}
                        ),
                        429,
                    )

                # Add current request
                request_counts[limiter_key].append(now)

            return f(*args, **kwargs)

        return decorated_function

    return decorator
