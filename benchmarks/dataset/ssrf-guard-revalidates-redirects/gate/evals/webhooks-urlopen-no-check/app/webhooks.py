"""Delivers events to the webhook URLs members register."""

import json
import urllib.error
import urllib.request

from app import config, store


def post_created(post):
    """The body of the post.created event."""
    return {
        "type": "post.created",
        "post": {"id": post.id, "author": post.author, "text": post.text, "url": post.url},
    }


def send_event(url, event):
    """POST one event as JSON. Returns True when the receiver answered 2xx."""
    request = urllib.request.Request(
        url,
        data=json.dumps(event).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "User-Agent": config.USER_AGENT},
    )
    try:
        with urllib.request.urlopen(request, timeout=config.FETCH_TIMEOUT_S) as response:
            return 200 <= response.status < 300
    except (urllib.error.URLError, OSError):
        return False


def deliver(event):
    for hook in list(store.webhooks.values()):
        send_event(hook.url, event)
