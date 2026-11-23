"""Async client for the local API of Lumen light strip controllers.

Pass a session whose `request(method, url, *, body=None, headers=None)` coroutine returns the
decoded JSON body, such as Hearth's `HttpSession`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

__all__ = ["LightState", "LumenController", "Session"]


class Session(Protocol):
    async def request(
        self, method: str, url: str, *, body: Any = None, headers: dict[str, str] | None = None
    ) -> Any: ...


@dataclass(frozen=True)
class LightState:
    on: bool
    brightness: int
    """From 0 to 255."""


class LumenController:
    def __init__(self, session: Session, host: str, api_key: str) -> None:
        self._session = session
        self._url = f"http://{host}/api/light"
        self._headers = {"X-Lumen-Key": api_key}

    async def get_light(self) -> LightState:
        data = await self._session.request("GET", self._url, headers=self._headers)
        return LightState(on=data["power"] == "on", brightness=int(data["bri"]))

    async def set_power(self, on: bool) -> None:
        body = {"power": "on" if on else "off"}
        await self._session.request("PUT", self._url, body=body, headers=self._headers)

    async def set_brightness(self, brightness: int) -> None:
        if not 0 <= brightness <= 255:
            raise ValueError(f"Cannot set brightness as it must be from 0 to 255: got {brightness}")
        await self._session.request("PUT", self._url, body={"bri": brightness}, headers=self._headers)
