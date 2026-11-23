"""The HTTP transport to the Pebblework platform's admin API."""

import json
import os
import urllib.error
import urllib.request

DEFAULT_URL = "https://admin-api.pebblework.internal/v2"


class NotFound(Exception):
    """The admin API answered 404: there is no resource at that path."""


def base_url() -> str:
    """The admin API's address, from PEBBLEWORK_ADMIN_URL."""
    return os.environ.get("PEBBLEWORK_ADMIN_URL", DEFAULT_URL)


def request(method: str, path: str, body: dict | None = None) -> dict:
    """Send one request to the admin API and return its JSON answer, or {} when it has none."""
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        base_url() + path,
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + os.environ.get("PEBBLEWORK_ADMIN_TOKEN", ""),
        },
    )
    try:
        with urllib.request.urlopen(req) as response:
            payload = response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404:
            raise NotFound(path) from error
        raise
    return json.loads(payload) if payload else {}
