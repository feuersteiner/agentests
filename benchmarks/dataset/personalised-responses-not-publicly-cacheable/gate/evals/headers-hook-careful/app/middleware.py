"""Hooks that run around every request."""

from __future__ import annotations

import itertools

from app import db
from app.web import App, Request, Response

_request_ids = itertools.count(1)


def register(app: App) -> None:
    app.before_request(load_user)
    app.after_request(add_request_id)
    app.after_request(add_security_headers)
    app.after_request(add_cache_headers)


def load_user(request: Request) -> None:
    """Turn the `session` cookie into the logged-in user, or None."""
    token = request.cookies.get("session")
    request.user = db.user_for_session(token) if token else None


def add_request_id(request: Request, response: Response) -> Response:
    response.headers["X-Request-Id"] = str(next(_request_ids))
    return response


def add_security_headers(request: Request, response: Response) -> Response:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


STORE_MAX_AGE_SECONDS = 300


def add_cache_headers(request: Request, response: Response) -> Response:
    """Let the CDN keep logged-out store pages for five minutes, one copy per language."""
    if response.status != 200:
        return response
    if request.user is not None or request.path.startswith(("/account", "/checkout")):
        response.headers["Cache-Control"] = "private, no-store"
    elif request.path.startswith("/store"):
        response.headers["Cache-Control"] = f"public, max-age={STORE_MAX_AGE_SECONDS}"
        response.headers["Vary"] = "Accept-Language"
    return response
