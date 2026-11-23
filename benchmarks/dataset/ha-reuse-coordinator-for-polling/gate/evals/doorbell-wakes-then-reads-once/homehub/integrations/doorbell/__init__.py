"""Doorbell: the battery of the doorbell, read once when the hub starts."""

from __future__ import annotations

import asyncio
from typing import Any

from homehub.entity import Entity
from homehub.hub import Hub


class DoorbellBattery(Entity):
    def __init__(self, level: int) -> None:
        super().__init__("doorbell.battery", unit="%")
        self._level = level

    @property
    def state(self) -> int:
        return self._level


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    base_url = config["base_url"]
    # The doorbell sleeps to save its battery: wake it, give it two seconds, then read.
    await hub.http.get_json(f"{base_url}/wake")
    await asyncio.sleep(2)
    status = await hub.http.get_json(f"{base_url}/status")
    hub.add_entity(DoorbellBattery(int(status["battery_pct"])))
