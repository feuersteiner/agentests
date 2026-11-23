"""The route table of the Perch web app, and `handle`, which passes a request to its view."""

from __future__ import annotations

from urllib.parse import parse_qsl

from accounts import views
from core.web import Response

ROUTES = {
    ("GET", "/login"): views.login_page,
    ("POST", "/login"): views.login,
    ("GET", "/forgot-password"): views.forgot_password_page,
    ("POST", "/forgot-password"): views.forgot_password,
}


def handle(method: str, path: str, data: dict[str, str] | None = None) -> Response:
    """Dispatch one request. Without `data`, the query string, if any, is the data."""
    path, _, query = path.partition("?")
    view = ROUTES.get((method.upper(), path))
    if view is None:
        return Response(404, "Not found")
    return view(dict(parse_qsl(query)) if data is None else data)
