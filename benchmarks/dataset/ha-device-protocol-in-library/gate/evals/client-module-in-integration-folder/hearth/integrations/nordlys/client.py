"""Client for the Nordlys plug's local API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PlugState:
    on: bool
    watts: float


class NordlysClient:
    def __init__(self, session: Any, host: str) -> None:
        self._session = session
        self._url = f"http://{host}/api/v1/state"

    async def get_state(self) -> PlugState:
        data = await self._session.request("GET", self._url)
        return PlugState(on=bool(data["on"]), watts=float(data["watts"]))

    async def set_on(self, on: bool) -> None:
        await self._session.request("POST", self._url, body={"on": on})
