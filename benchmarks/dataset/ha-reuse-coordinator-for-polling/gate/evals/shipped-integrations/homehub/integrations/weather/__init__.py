"""Weather: the outdoor temperature from the weather service."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from homehub.coordinator import PollingCoordinator
from homehub.entity import CoordinatorEntity
from homehub.hub import Hub
from homehub.integrations.weather.client import WeatherClient

UPDATE_INTERVAL = timedelta(minutes=10)


class TemperatureSensor(CoordinatorEntity):
    def __init__(self, coordinator: PollingCoordinator[dict[str, Any]]) -> None:
        super().__init__(coordinator, "weather.temperature", unit="°C")

    @property
    def state(self) -> float | None:
        if self.coordinator.data is None:
            return None
        return self.coordinator.data["temperature"]


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = WeatherClient(hub.http, config["base_url"], config["location"])
    coordinator = PollingCoordinator(
        hub,
        name="weather",
        update_method=client.get_current,
        update_interval=UPDATE_INTERVAL,
    )
    await coordinator.async_refresh()
    hub.add_entity(TemperatureSensor(coordinator))
