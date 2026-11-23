"""JSON over HTTP, for the outside systems the service talks to."""

import json
import urllib.request


def post_json(url: str, payload: dict) -> dict:
    """POST `payload` as JSON to `url` and return the JSON answer."""
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read() or b"{}")
