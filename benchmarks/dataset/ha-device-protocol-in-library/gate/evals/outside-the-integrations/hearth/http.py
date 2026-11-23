"""The JSON-over-HTTP session the hub keeps as `hub.session`."""

from __future__ import annotations

import asyncio
import json
import urllib.request
from typing import Any


class HttpSession:
    """Sends HTTP requests with JSON bodies and decodes the JSON answers."""

    def __init__(self, timeout: float = 10.0) -> None:
        self.timeout = timeout

    async def request(
        self,
        method: str,
        url: str,
        *,
        body: Any = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        """Send the request and return the decoded JSON body, or None when the body is empty."""
        return await asyncio.to_thread(self._send, method, url, body, dict(headers or {}))

    def _send(self, method: str, url: str, body: Any, headers: dict[str, str]) -> Any:
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        headers.setdefault("User-Agent", "hearth/0.4")
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            raw = response.read()
        return json.loads(raw) if raw else None
