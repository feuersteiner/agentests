"""A small request and response layer in the style of Flask, so the API needs no framework."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Request:
    method: str
    path: str
    json: Any = None
    headers: dict[str, str] = field(default_factory=dict)

    @property
    def member_id(self) -> str | None:
        """The signed-in member, from the X-Member header the gateway sets after login."""
        return self.headers.get("X-Member")


@dataclass
class Response:
    body: Any = None
    status: int = 200


def error(status: int, message: str) -> Response:
    return Response({"error": message}, status=status)


View = Callable[..., Response]


class App:
    def __init__(self) -> None:
        self.routes: list[tuple[str, re.Pattern[str], View]] = []

    def route(self, method: str, pattern: str) -> Callable[[View], View]:
        """Register a view; each `<name>` matches one path segment and is passed as `name`."""
        regex = re.compile("^" + re.sub(r"<(\w+)>", r"(?P<\1>[^/]+)", pattern) + "$")

        def register(view: View) -> View:
            self.routes.append((method, regex, view))
            return view

        return register

    def handle(self, request: Request) -> Response:
        path_known = False
        for method, regex, view in self.routes:
            match = regex.match(request.path)
            if match is None:
                continue
            if method == request.method:
                return view(request, **match.groupdict())
            path_known = True
        if path_known:
            return error(405, "method not allowed")
        return error(404, "not found")
