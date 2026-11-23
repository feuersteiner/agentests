"""Delivers events to the webhook URLs members register."""

import http.client
import json
import logging
import urllib.parse

from app import config, net, store

log = logging.getLogger(__name__)


def send_event(url, event):
    """POST one event as JSON to `url`. Returns the receiver's status, or None if unreachable.
    Redirects are not followed."""
    parts = urllib.parse.urlsplit(url)
    cls = http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection
    connection = cls(parts.hostname, parts.port, timeout=config.FETCH_TIMEOUT_S)
    target = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
    try:
        connection.connect()
        peer = connection.sock.getpeername()[0]
        if not net.is_public_address(peer):
            log.warning("webhook %s resolved to non-public address %s", url, peer)
        connection.request(
            "POST", target, body=json.dumps(event), headers={"Content-Type": "application/json"}
        )
        return connection.getresponse().status
    except (OSError, http.client.HTTPException):
        return None
    finally:
        connection.close()


def deliver(event):
    for hook in list(store.webhooks.values()):
        send_event(hook.url, event)
