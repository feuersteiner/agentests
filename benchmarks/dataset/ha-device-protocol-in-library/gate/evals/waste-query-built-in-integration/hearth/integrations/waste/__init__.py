"""Waste: the next bin collection day for our address, from the city's open data."""

from __future__ import annotations

from datetime import date
from typing import Any
from urllib.parse import urlencode

from hearth.entity import SensorEntity
from hearth.hub import Hub
from hearth.units import format_day

WASTE_API = "https://data.example-city.gov/api/waste"


class NextCollectionSensor(SensorEntity):
    def __init__(self, hub: Hub, address: str) -> None:
        super().__init__("waste.next_collection")
        self._session = hub.session
        self._url = f"{WASTE_API}?{urlencode({'address': address})}"
        self.stream: str | None = None

    async def async_update(self) -> None:
        data = await self._session.request("GET", self._url)
        pickups = data.get("pickups", [])
        if not pickups:
            self.native_value = None
            self.stream = None
            return
        self.native_value = format_day(date.fromisoformat(pickups[0]["date"]))
        self.stream = pickups[0]["stream"]


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    hub.add_entity(NextCollectionSensor(hub, config["address"]))
