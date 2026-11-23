"""Async client for the local API of Nordlys smart plugs.

Pass a session whose `request(method, url, *, body=None, headers=None)` coroutine returns the
decoded JSON body, such as Hearth's `HttpSession`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

__all__ = ["NordlysPlug", "PlugState", "Session"]


class Session(Protocol):
    async def request(
        self, method: str, url: str, *, body: Any = None, headers: dict[str, str] | None = None
    ) -> Any: ...


@dataclass(frozen=True)
class PlugState:
    on: bool
    watts: float
    """What the plugged-in device draws right now, in watts."""


class NordlysPlug:
    def __init__(self, session: Session, host: str) -> None:
        self._session = session
        self._url = f"http://{host}/api/v1/state"

    async def get_state(self) -> PlugState:
        data = await self._session.request("GET", self._url)
        return PlugState(on=bool(data["on"]), watts=float(data["watts"]))

    async def set_on(self, on: bool) -> None:
        await self._session.request("POST", self._url, body={"on": on})
