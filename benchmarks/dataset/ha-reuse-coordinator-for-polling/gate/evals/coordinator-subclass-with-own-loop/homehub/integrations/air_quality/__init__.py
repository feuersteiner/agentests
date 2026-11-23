"""Air quality: the air quality index of the nearest measuring station."""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from homehub.coordinator import PollingCoordinator
from homehub.entity import CoordinatorEntity
from homehub.hub import Hub
from homehub.integrations.air_quality.client import AirQualityClient

UPDATE_INTERVAL = timedelta(minutes=5)


class AirQualityCoordinator(PollingCoordinator[int]):
    """Refreshes the index on its own task so a slow station never holds up the hub."""

    def start(self) -> None:
        self._runner = asyncio.create_task(self._run())

    def async_shutdown(self) -> None:
        self._runner.cancel()

    async def _run(self) -> None:
        while True:
            try:
                self.data = await self._update_method()
                self.last_update_success = True
            except OSError:
                self.last_update_success = False
            for listener in list(self._listeners):
                listener()
            await asyncio.sleep(self.update_interval.total_seconds())

    def _plan(self, delay: timedelta) -> None:
        return None


class AirQualitySensor(CoordinatorEntity):
    def __init__(self, coordinator: AirQualityCoordinator) -> None:
        super().__init__(coordinator, "air_quality.index", unit="AQI")

    @property
    def state(self) -> int | None:
        return self.coordinator.data


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = AirQualityClient(hub.http, config["base_url"], config["station"])
    coordinator = AirQualityCoordinator(
        hub, name="air_quality", update_method=client.get_index, update_interval=UPDATE_INTERVAL
    )
    await coordinator.async_refresh()
    coordinator.start()
    hub.add_entity(AirQualitySensor(coordinator))
