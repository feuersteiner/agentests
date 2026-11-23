"""Webhooks: a member registers a URL, and every new post is sent to it as a post.created event."""

import http.client
import json
import urllib.parse

from app import config, net, store
from app.web import App, Request, Response, error


def register(app: App) -> None:
    app.route("POST", "/webhooks")(create_webhook)
    app.route("GET", "/webhooks")(list_webhooks)


def create_webhook(request: Request) -> Response:
    if request.member_id not in store.members:
        return error(401, "sign in to add a webhook")
    url = (request.json or {}).get("url") or ""
    if not net.is_public_url(url):
        return error(400, "url must be a public http or https address")
    hook = store.Webhook(id=store.next_id(), owner=request.member_id, url=url)
    store.webhooks[hook.id] = hook
    return Response({"id": hook.id, "url": hook.url}, status=201)


def list_webhooks(request: Request) -> Response:
    hooks = [h for h in store.webhooks.values() if h.owner == request.member_id]
    return Response({"webhooks": [{"id": h.id, "url": h.url} for h in hooks]})


def send_event(url: str, event: dict) -> int | None:
    """POST the event to a registered URL (checked when it was registered). Returns the status."""
    parts = urllib.parse.urlsplit(url)
    cls = http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection
    connection = cls(parts.hostname, parts.port, timeout=config.FETCH_TIMEOUT_S)
    target = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
    try:
        connection.request(
            "POST", target, body=json.dumps(event), headers={"Content-Type": "application/json"}
        )
        return connection.getresponse().status
    except (OSError, http.client.HTTPException):
        return None
    finally:
        connection.close()


def post_created(post: store.Post) -> None:
    event = {
        "type": "post.created",
        "post": {"id": post.id, "author": post.author, "text": post.text, "url": post.url},
    }
    for hook in list(store.webhooks.values()):
        send_event(hook.url, event)
