"""Air quality: the air quality index of the nearest measuring station."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from homehub.coordinator import PollingCoordinator
from homehub.entity import CoordinatorEntity
from homehub.hub import Hub
from homehub.integrations.air_quality.client import AirQualityClient

UPDATE_INTERVAL = timedelta(minutes=5)


class AirQualitySensor(CoordinatorEntity):
    def __init__(self, coordinator: PollingCoordinator[int]) -> None:
        super().__init__(coordinator, "air_quality.index", unit="AQI")

    @property
    def state(self) -> int | None:
        return self.coordinator.data


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = AirQualityClient(hub.http, config["base_url"], config["station"])
    coordinator = PollingCoordinator(
        hub,
        name="air_quality",
        update_method=client.get_index,
        update_interval=UPDATE_INTERVAL,
    )
    await coordinator.async_refresh()
    hub.add_entity(AirQualitySensor(coordinator))
