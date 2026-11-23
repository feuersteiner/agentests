"""Delivers events to the webhook URLs members register."""

import json
import http.client
import urllib.parse

from app import config, net, store


class DeliveryFailed(Exception):
    pass


def post_created(post):
    """The body of the post.created event."""
    return {
        "type": "post.created",
        "post": {"id": post.id, "author": post.author, "text": post.text, "url": post.url},
    }


def send_event(url, event):
    """POST one event as JSON to `url`. A redirect counts as a failed delivery: it is not followed."""
    if not net.is_public_url(url):
        raise DeliveryFailed(f"{url} is not a public address")
    parts = urllib.parse.urlsplit(url)
    cls = http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection
    connection = cls(parts.hostname, parts.port, timeout=config.FETCH_TIMEOUT_S)
    target = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
    body = json.dumps(event).encode()
    try:
        connection.connect()
        if not net.is_public_address(connection.sock.getpeername()[0]):
            raise DeliveryFailed(f"{url} is not a public address")
        connection.request(
            "POST",
            target,
            body=body,
            headers={"Content-Type": "application/json", "User-Agent": config.USER_AGENT},
        )
        status = connection.getresponse().status
    except (OSError, http.client.HTTPException) as exc:
        raise DeliveryFailed(f"could not reach {url}") from exc
    finally:
        connection.close()
    if not 200 <= status < 300:
        raise DeliveryFailed(f"{url} answered {status}")


def deliver(event):
    """Send an event to every registered webhook; one failing receiver does not stop the others."""
    for hook in list(store.webhooks.values()):
        try:
            send_event(hook.url, event)
        except DeliveryFailed:
            hook.failures += 1
