"""Solar: the charge of the inverter's battery."""

from __future__ import annotations

import asyncio
import threading
from typing import Any

from homehub.entity import Entity
from homehub.hub import Hub
from homehub.integrations.solar.client import SolarClient

# The inverter API allows at most one request per minute.
MIN_SECONDS_BETWEEN_REQUESTS = 60


class BatteryLevelSensor(Entity):
    def __init__(self, client: SolarClient, loop: asyncio.AbstractEventLoop) -> None:
        super().__init__("solar.battery_level", unit="%")
        self._client = client
        self._loop = loop
        self._level: int | None = None
        self._timer: threading.Timer | None = None

    @property
    def state(self) -> int | None:
        return self._level

    async def async_update(self) -> None:
        self._level = await self._client.get_battery_level()
        self.state_changed()
        self._timer = threading.Timer(MIN_SECONDS_BETWEEN_REQUESTS, self._tick)
        self._timer.daemon = True
        self._timer.start()

    def _tick(self) -> None:
        asyncio.run_coroutine_threadsafe(self.async_update(), self._loop)

    def cancel(self) -> None:
        if self._timer is not None:
            self._timer.cancel()


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = SolarClient(hub.http, config["base_url"])
    sensor = BatteryLevelSensor(client, asyncio.get_running_loop())
    await sensor.async_update()
    hub.add_entity(sensor)
    hub.on_stop(sensor.cancel)
