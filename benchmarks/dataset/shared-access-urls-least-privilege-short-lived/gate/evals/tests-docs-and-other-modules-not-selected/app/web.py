"""A small router for the API's JSON endpoints. The gateway in front of it signs users in and
passes the user's id along, so every request that reaches a handler has `user_id` set."""

import re
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Request:
    method: str
    path: str
    user_id: str | None = None
    json: dict = field(default_factory=dict)
    body: bytes = b""
    headers: dict[str, str] = field(default_factory=dict)


@dataclass
class Response:
    status: int
    json: object = None
    headers: dict[str, str] = field(default_factory=dict)
    body: bytes = b""


_routes: list[tuple[str, re.Pattern, Callable[..., Response]]] = []


def route(method: str, pattern: str):
    """Register a handler; `<name>` in the pattern becomes a keyword argument."""
    regex = re.compile("^" + re.sub(r"<(\w+)>", r"(?P<\1>[A-Za-z0-9_.-]+)", pattern) + "$")

    def register(handler):
        _routes.append((method, regex, handler))
        return handler

    return register


def dispatch(request: Request) -> Response:
    if request.user_id is None:
        return Response(401, {"error": "sign in first"})
    for method, regex, handler in _routes:
        match = regex.match(request.path)
        if match and method == request.method:
            return handler(request, **match.groupdict())
    return Response(404, {"error": "not found"})
