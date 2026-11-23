"""Solar: what the roof panels produce right now."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from homehub.coordinator import PollingCoordinator
from homehub.entity import CoordinatorEntity
from homehub.hub import Hub
from homehub.integrations.solar.client import SolarClient

UPDATE_INTERVAL = timedelta(seconds=30)


class SolarOutputSensor(CoordinatorEntity):
    def __init__(self, coordinator: PollingCoordinator[float]) -> None:
        super().__init__(coordinator, "solar.output", unit="W")

    @property
    def state(self) -> float | None:
        return self.coordinator.data


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = SolarClient(hub.http, config["base_url"])
    coordinator = PollingCoordinator(
        hub,
        name="solar",
        update_method=client.get_output,
        update_interval=UPDATE_INTERVAL,
    )
    await coordinator.async_refresh()
    hub.add_entity(SolarOutputSensor(coordinator))
