"""A small HTTP layer: a router, the request it dispatches and the JSON response."""

import re
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Request:
    method: str
    path: str
    query: dict[str, str] = field(default_factory=dict)
    json: dict[str, Any] | None = None


@dataclass
class Response:
    status: int
    body: dict[str, Any]


def json_response(body: dict[str, Any], status: int = 200) -> Response:
    return Response(status, body)


def _compile(pattern: str) -> re.Pattern[str]:
    """`/orders/<int:order_id>` matches digits only; `<name>` matches one path segment."""

    def group(match: re.Match[str]) -> str:
        return f"(?P<{match[2]}>{'[0-9]+' if match[1] else '[^/]+'})"

    return re.compile("^" + re.sub(r"<(int:)?(\w+)>", group, pattern) + "$")


class Router:
    """Maps a method and a path pattern to a handler called as `handler(request, db, **params)`."""

    def __init__(self) -> None:
        self.routes: list[tuple[str, str, re.Pattern[str], Callable[..., Response]]] = []

    def route(self, method: str, pattern: str) -> Callable[[Callable[..., Response]], Callable[..., Response]]:
        def register(handler: Callable[..., Response]) -> Callable[..., Response]:
            self.routes.append((method, pattern, _compile(pattern), handler))
            return handler

        return register

    def get(self, pattern: str):
        return self.route("GET", pattern)

    def post(self, pattern: str):
        return self.route("POST", pattern)

    def include(self, other: "Router") -> None:
        self.routes.extend(other.routes)

    def dispatch(self, request: Request, db) -> Response:
        for method, pattern, regex, handler in self.routes:
            match = regex.match(request.path)
            if match and method == request.method:
                params = {
                    name: int(value) if f"<int:{name}>" in pattern else value
                    for name, value in match.groupdict().items()
                }
                return handler(request, db, **params)
        return json_response({"error": "not found"}, 404)
