"""Waste: the next bin collection day for our address, from the city's open data."""

from __future__ import annotations

from typing import Any

from pycitywaste import WasteCalendar

from hearth.entity import SensorEntity
from hearth.hub import Hub
from hearth.units import format_day


class NextCollectionSensor(SensorEntity):
    def __init__(self, calendar: WasteCalendar, address: str) -> None:
        super().__init__("waste.next_collection")
        self._calendar = calendar
        self._address = address
        self.stream: str | None = None

    async def async_update(self) -> None:
        pickups = await self._calendar.pickups(self._address)
        if not pickups:
            self.native_value = None
            self.stream = None
            return
        self.native_value = format_day(pickups[0].date)
        self.stream = pickups[0].stream


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    calendar = WasteCalendar(hub.session)
    hub.add_entity(NextCollectionSensor(calendar, config["address"]))
