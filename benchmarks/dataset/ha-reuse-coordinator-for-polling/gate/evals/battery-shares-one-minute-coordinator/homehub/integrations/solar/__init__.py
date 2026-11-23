"""Solar: the output of the roof panels and the charge of the inverter's battery."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from homehub.coordinator import PollingCoordinator
from homehub.entity import CoordinatorEntity
from homehub.hub import Hub
from homehub.integrations.solar.client import SolarClient

# The inverter accepts one request a minute and a refresh makes two, so refresh every two minutes.
UPDATE_INTERVAL = timedelta(minutes=2)


class SolarOutputSensor(CoordinatorEntity):
    def __init__(self, coordinator: PollingCoordinator[dict[str, Any]]) -> None:
        super().__init__(coordinator, "solar.output", unit="W")

    @property
    def state(self) -> float | None:
        data = self.coordinator.data
        return None if data is None else data["output_w"]


class BatteryLevelSensor(CoordinatorEntity):
    def __init__(self, coordinator: PollingCoordinator[dict[str, Any]]) -> None:
        super().__init__(coordinator, "solar.battery_level", unit="%")

    @property
    def state(self) -> int | None:
        data = self.coordinator.data
        return None if data is None else data["battery_pct"]


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = SolarClient(hub.http, config["base_url"])

    async def update() -> dict[str, Any]:
        return {
            "output_w": await client.get_output(),
            "battery_pct": await client.get_battery_level(),
        }

    coordinator = PollingCoordinator(
        hub, name="solar", update_method=update, update_interval=UPDATE_INTERVAL
    )
    await coordinator.async_refresh()
    hub.add_entity(SolarOutputSensor(coordinator))
    hub.add_entity(BatteryLevelSensor(coordinator))
