"""Solar: what the roof panels produce right now."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homehub.entity import Entity
from homehub.hub import Hub
from homehub.integrations.solar.client import SolarClient

_LOGGER = logging.getLogger(__name__)

REFRESH_SECONDS = 30


class SolarOutputSensor(Entity):
    def __init__(self, client: SolarClient) -> None:
        super().__init__("solar.output", unit="W")
        self._client = client
        self._watts: float | None = None

    @property
    def state(self) -> float | None:
        return self._watts

    async def async_update(self) -> None:
        self._watts = await self._client.get_output()
        self.state_changed()

    async def _poll(self) -> None:
        while True:
            await asyncio.sleep(REFRESH_SECONDS)
            try:
                await self.async_update()
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Could not read the solar output")


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = SolarClient(hub.http, config["base_url"])
    sensor = SolarOutputSensor(client)
    await sensor.async_update()
    hub.add_entity(sensor)
    task = asyncio.create_task(sensor._poll())
    hub.on_stop(task.cancel)
