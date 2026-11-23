"""A small request and response layer in the style of Flask, on the standard library only."""

from __future__ import annotations

import contextvars
import json as jsonlib
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.parse import quote, urlencode

log = logging.getLogger(__name__)

_app: contextvars.ContextVar[App] = contextvars.ContextVar("app")
_request: contextvars.ContextVar[Request] = contextvars.ContextVar("request")


class HTTPError(Exception):
    """Raise from a view to answer with `status` and a JSON error message."""

    status = 500

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class BadRequest(HTTPError):
    status = 400


class Unauthorized(HTTPError):
    status = 401


class Forbidden(HTTPError):
    status = 403


class NotFound(HTTPError):
    status = 404


@dataclass
class Request:
    method: str
    path: str
    headers: dict[str, str] = field(default_factory=dict)
    form: dict[str, str] = field(default_factory=dict)
    args: dict[str, str] = field(default_factory=dict)
    scheme: str = "http"
    user: Any = None  # set by auth.load_user before the view runs

    def __post_init__(self) -> None:
        self.headers = {name.title(): value for name, value in self.headers.items()}

    @property
    def host(self) -> str:
        """The host the client asked for: X-Forwarded-Host behind the load balancer, else Host."""
        return self.headers.get("X-Forwarded-Host") or self.headers.get("Host", "localhost")

    @property
    def host_url(self) -> str:
        """The scheme and host the client used, with a trailing slash."""
        scheme = self.headers.get("X-Forwarded-Proto", self.scheme)
        return f"{scheme}://{self.host}/"

    @property
    def url(self) -> str:
        """The full URL the client asked for."""
        query = f"?{urlencode(self.args)}" if self.args else ""
        return f"{self.host_url.rstrip('/')}{self.path}{query}"


@dataclass
class Response:
    body: str = ""
    status: int = 200
    headers: dict[str, str] = field(
        default_factory=lambda: {"Content-Type": "text/html; charset=utf-8"}
    )

    def json(self) -> Any:
        return jsonlib.loads(self.body)


def json(data: Any, status: int = 200) -> Response:
    return Response(jsonlib.dumps(data), status, {"Content-Type": "application/json"})


def html(body: str, status: int = 200) -> Response:
    return Response(body, status)


View = Callable[..., Response]
_PARAM = re.compile(r"<(?:(int):)?(\w+)>")


@dataclass
class Rule:
    pattern: str
    methods: tuple[str, ...]
    endpoint: str
    view: View

    def __post_init__(self) -> None:
        def group(match: re.Match[str]) -> str:
            kind, name = match.groups()
            return rf"(?P<{name}>\d+)" if kind == "int" else rf"(?P<{name}>[^/]+)"

        self.regex = re.compile("^" + _PARAM.sub(group, self.pattern) + "$")
        self.ints = {name for kind, name in _PARAM.findall(self.pattern) if kind == "int"}

    def match(self, path: str) -> dict[str, Any] | None:
        found = self.regex.match(path)
        if not found:
            return None
        return {k: int(v) if k in self.ints else v for k, v in found.groupdict().items()}

    def build(self, values: dict[str, Any]) -> str:
        rest = dict(values)
        path = _PARAM.sub(lambda m: quote(str(rest.pop(m.group(2))), safe=""), self.pattern)
        return f"{path}?{urlencode(rest)}" if rest else path


class Blueprint:
    """A group of views registered on the app together; endpoints are "<name>.<function>"."""

    def __init__(self, name: str) -> None:
        self.name = name
        self.rules: list[Rule] = []

    def route(self, pattern: str, methods: list[str] | None = None) -> Callable[[View], View]:
        def register(view: View) -> View:
            endpoint = f"{self.name}.{view.__name__}"
            self.rules.append(Rule(pattern, tuple(methods or ["GET"]), endpoint, view))
            return view

        return register


class App:
    def __init__(self) -> None:
        self.rules: list[Rule] = []
        self.before_hooks: list[Callable[[Request], None]] = []

    def register(self, blueprint: Blueprint) -> None:
        self.rules.extend(blueprint.rules)

    def before_request(self, hook: Callable[[Request], None]) -> None:
        self.before_hooks.append(hook)

    def build_path(self, endpoint: str, values: dict[str, Any]) -> str:
        for rule in self.rules:
            if rule.endpoint == endpoint:
                return rule.build(values)
        raise LookupError(f"No route for endpoint {endpoint!r}")

    def handle(self, request: Request) -> Response:
        app_token = _app.set(self)
        request_token = _request.set(request)
        try:
            for hook in self.before_hooks:
                hook(request)
            return self._dispatch(request)
        except HTTPError as error:
            return json({"error": error.message}, status=error.status)
        except Exception:
            log.exception("Unhandled error on %s %s", request.method, request.path)
            return json({"error": "Internal server error"}, status=500)
        finally:
            _request.reset(request_token)
            _app.reset(app_token)

    def _dispatch(self, request: Request) -> Response:
        allowed = False
        for rule in self.rules:
            params = rule.match(request.path)
            if params is None:
                continue
            if request.method in rule.methods:
                return rule.view(request, **params)
            allowed = True
        if allowed:
            return json({"error": "Method not allowed"}, status=405)
        raise NotFound("Not found")


def url_for(endpoint: str, _external: bool = False, **values: Any) -> str:
    """The URL of the view named `endpoint`, such as "auth.login", as Flask builds it.

    Values that fill no `<name>` of the route go in the query string. With `_external=True`
    the URL is absolute, with the scheme and host of the current request.
    """
    path = _app.get().build_path(endpoint, values)
    if _external:
        return _request.get().host_url.rstrip("/") + path
    return path
