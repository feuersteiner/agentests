"""A small client for the fleet controller's HTTP API."""

import json
import os
import urllib.request

DEFAULT_URL = "http://fleet.kestrel.internal:8080"
TIMEOUT_SECONDS = 30


def base_url() -> str:
    """The controller's address, from KESTREL_FLEET_URL."""
    return os.environ.get("KESTREL_FLEET_URL", DEFAULT_URL)


def request(method: str, path: str, body: dict | None = None) -> dict:
    """Send one request to the controller and return its JSON answer, or {} when it has none."""
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        base_url() + path,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as response:
        payload = response.read()
    return json.loads(payload) if payload else {}
