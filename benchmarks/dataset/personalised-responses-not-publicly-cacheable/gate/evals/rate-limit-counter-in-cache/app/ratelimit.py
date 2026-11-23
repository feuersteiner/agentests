"""Limits how often one address may try to log in, with counters kept in the shared cache."""

from __future__ import annotations

import time

from app.cache import cache
from app.web import Request, Response

LOGIN_ATTEMPTS_PER_MINUTE = 5


def _key(request: Request) -> str:
    address = request.headers.get("X-Forwarded-For", "unknown").split(",")[0].strip()
    return f"login-attempts:{address}:{int(time.time() // 60)}"


def too_many_login_attempts(request: Request) -> bool:
    attempts = int(cache.get(_key(request)) or 0)
    return attempts >= LOGIN_ATTEMPTS_PER_MINUTE


def record_login_attempt(request: Request) -> None:
    key = _key(request)
    attempts = int(cache.get(key) or 0) + 1
    cache.set(key, str(attempts), ttl=60)


def rate_limited() -> Response:
    return Response("Too many attempts", status=429, headers={"Retry-After": "60"})
