"""Test doubles shared by the suite."""

from __future__ import annotations

from typing import Any


class FakeHttp:
    """Answers get_json from a dict of URL to body, and records the URLs asked for."""

    def __init__(self, bodies: dict[str, Any]) -> None:
        self.bodies = bodies
        self.requests: list[str] = []

    async def get_json(self, url: str) -> Any:
        self.requests.append(url)
        return self.bodies[url]
