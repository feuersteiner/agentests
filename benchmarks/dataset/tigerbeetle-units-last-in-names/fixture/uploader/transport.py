"""HTTP transport for Depot, kept apart from the client so tests can swap in a fake."""

import urllib.error
import urllib.request
from dataclasses import dataclass


@dataclass
class Response:
    status: int
    body: bytes


class HttpTransport:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token

    def request(self, method: str, path: str, body: bytes, timeout_s: float, headers=None) -> Response:
        request = urllib.request.Request(
            self.base_url + path,
            data=body,
            method=method,
            headers={"Authorization": f"Bearer {self.token}", **(headers or {})},
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout_s) as response:
                return Response(response.status, response.read())
        except urllib.error.HTTPError as error:
            # Depot puts the reason for a 4xx in the body, so keep it for the caller.
            return Response(error.code, error.read())
