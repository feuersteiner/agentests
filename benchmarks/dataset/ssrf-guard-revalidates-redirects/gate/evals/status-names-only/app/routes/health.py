"""Health and status pages for the load balancer and the on-call dashboard."""

from http.client import responses

from app import store
from app.web import App, Request, Response


def register(app: App) -> None:
    app.route("GET", "/health")(health)
    app.route("GET", "/status/<code>")(status_page)


def health(request: Request) -> Response:
    return Response({"status": "ok", "members": len(store.members), "posts": len(store.posts)})


def status_page(request: Request, code: str) -> Response:
    """Explain an HTTP status code, for the error pages of the web app."""
    number = int(code) if code.isdigit() else 0
    if number not in responses:
        return Response({"error": "unknown status"}, status=404)
    return Response({"status": number, "reason": responses[number]})
