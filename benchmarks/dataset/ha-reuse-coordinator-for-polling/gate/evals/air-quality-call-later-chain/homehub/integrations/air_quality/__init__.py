"""Air quality: the air quality index of the nearest measuring station."""

from __future__ import annotations

import asyncio
from typing import Any

from homehub.entity import Entity
from homehub.hub import Hub
from homehub.integrations.air_quality.client import AirQualityClient

UPDATE_SECONDS = 5 * 60


class AirQualitySensor(Entity):
    def __init__(self, client: AirQualityClient, index: int) -> None:
        super().__init__("air_quality.index", unit="AQI")
        self._client = client
        self._index = index
        self._handle: asyncio.TimerHandle | None = None

    @property
    def state(self) -> int:
        return self._index

    def start(self) -> None:
        loop = asyncio.get_running_loop()
        self._handle = loop.call_later(UPDATE_SECONDS, self._on_due)

    def stop(self) -> None:
        if self._handle is not None:
            self._handle.cancel()

    def _on_due(self) -> None:
        asyncio.ensure_future(self._update())

    async def _update(self) -> None:
        self._index = await self._client.get_index()
        self.state_changed()
        self.start()


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = AirQualityClient(hub.http, config["base_url"], config["station"])
    sensor = AirQualitySensor(client, await client.get_index())
    hub.add_entity(sensor)
    sensor.start()
    hub.on_stop(sensor.stop)
