"""Async client for the city's open data waste collection API."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any
from urllib.parse import urlencode

__all__ = ["Pickup", "WasteCalendar"]

DEFAULT_BASE_URL = "https://data.example-city.gov"


@dataclass(frozen=True)
class Pickup:
    date: date
    stream: str


class WasteCalendar:
    def __init__(self, session: Any, base_url: str = DEFAULT_BASE_URL) -> None:
        self._session = session
        self._base_url = base_url.rstrip("/")

    async def pickups(self, address: str) -> list[Pickup]:
        """Return the coming pickups at `address`, soonest first."""
        url = f"{self._base_url}/api/waste?{urlencode({'address': address})}"
        data = await self._session.request("GET", url)
        return [
            Pickup(date=date.fromisoformat(item["date"]), stream=item["stream"])
            for item in data["pickups"]
        ]
