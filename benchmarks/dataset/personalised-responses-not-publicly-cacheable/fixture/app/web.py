"""A small request and response layer for the store, in the style of Flask."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Request:
    method: str
    path: str
    headers: dict[str, str] = field(default_factory=dict)
    cookies: dict[str, str] = field(default_factory=dict)
    query: dict[str, str] = field(default_factory=dict)
    user: Any = None  # set by middleware.load_user before the view runs


@dataclass
class Response:
    body: str = ""
    status: int = 200
    headers: dict[str, str] = field(
        default_factory=lambda: {"Content-Type": "text/html; charset=utf-8"}
    )


class NotFound(Exception):
    """Raise from a view to answer 404."""


View = Callable[..., Response]


class App:
    def __init__(self) -> None:
        self.routes: list[tuple[re.Pattern[str], View]] = []
        self.before_hooks: list[Callable[[Request], None]] = []
        self.after_hooks: list[Callable[[Request, Response], Response]] = []

    def route(self, pattern: str) -> Callable[[View], View]:
        """Register a view; each `<name>` matches one path segment and is passed as `name`."""
        regex = re.compile("^" + re.sub(r"<(\w+)>", r"(?P<\1>[^/]+)", pattern) + "$")

        def register(view: View) -> View:
            self.routes.append((regex, view))
            return view

        return register

    def before_request(self, hook: Callable[[Request], None]) -> None:
        self.before_hooks.append(hook)

    def after_request(self, hook: Callable[[Request, Response], Response]) -> None:
        self.after_hooks.append(hook)

    def handle(self, request: Request) -> Response:
        for hook in self.before_hooks:
            hook(request)
        response = self._dispatch(request)
        for hook in self.after_hooks:
            response = hook(request, response)
        return response

    def _dispatch(self, request: Request) -> Response:
        for regex, view in self.routes:
            match = regex.match(request.path)
            if match:
                try:
                    return view(request, **match.groupdict())
                except NotFound:
                    break
        return Response("<h1>Not found</h1>", status=404)
