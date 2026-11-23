"""The JSON-over-HTTP client the integrations share."""

from __future__ import annotations

import asyncio
import json
import urllib.request
from typing import Any


class HttpClient:
    async def get_json(self, url: str) -> Any:
        """GET `url` and return the decoded JSON body."""
        return await asyncio.to_thread(self._get, url)

    def _get(self, url: str) -> Any:
        with urllib.request.urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
