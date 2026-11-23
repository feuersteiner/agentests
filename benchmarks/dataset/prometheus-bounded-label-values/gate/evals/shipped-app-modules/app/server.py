"""The route table and handle(), which turns a Request into a Response."""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass

from app import views
from app.http import HTTPError, NotFound, Request, Response
from app.metrics import HTTP_REQUESTS
from app.models import USERS, User

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Route:
    method: str
    template: str  # such as "/cart/items/<sku>"
    handler: Callable[..., Response]

    def match(self, method: str, path: str) -> dict[str, str] | None:
        """The named parts of the path when the route matches it, otherwise None."""
        if method != self.method:
            return None
        parts, wanted = path.strip("/").split("/"), self.template.strip("/").split("/")
        if len(parts) != len(wanted):
            return None
        params = {}
        for part, want in zip(parts, wanted):
            if want.startswith("<") and want.endswith(">"):
                params[want[1:-1]] = part
            elif part != want:
                return None
        return params


ROUTES = [
    Route("GET", "/products/<sku>", views.get_product),
    Route("GET", "/cart", views.get_cart),
    Route("POST", "/cart/items", views.add_item),
    Route("DELETE", "/cart/items/<sku>", views.remove_item),
    Route("POST", "/checkout", views.checkout),
    Route("GET", "/metrics", views.metrics),
]


def authenticate(request: Request) -> User | None:
    """The user named by the X-User-Id header, which the edge proxy sets after sign-in."""
    raw = request.headers.get("X-User-Id", "")
    return USERS.get(int(raw)) if raw.isdigit() else None


def handle(request: Request) -> Response:
    request.user = authenticate(request)
    template = "unmatched"
    try:
        for route in ROUTES:
            params = route.match(request.method, request.path)
            if params is not None:
                template = route.template
                response = route.handler(request, **params)
                break
        else:
            raise NotFound("no such route")
    except HTTPError as exc:
        response = Response(exc.status, {"error": exc.message})
    except Exception:
        log.exception("unhandled error on %s %s", request.method, request.path)
        response = Response(500, {"error": "internal error"})
    HTTP_REQUESTS.labels(
        route=template, method=request.method, status_class=f"{response.status // 100}xx"
    ).inc()
    return response
