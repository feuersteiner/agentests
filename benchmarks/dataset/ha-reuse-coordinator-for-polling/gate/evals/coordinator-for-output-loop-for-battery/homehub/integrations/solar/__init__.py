"""Solar: the output of the roof panels and the charge of the inverter's battery."""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from homehub.coordinator import PollingCoordinator
from homehub.entity import CoordinatorEntity, Entity
from homehub.hub import Hub
from homehub.integrations.solar.client import SolarClient


class SolarOutputSensor(CoordinatorEntity):
    def __init__(self, coordinator: PollingCoordinator[float]) -> None:
        super().__init__(coordinator, "solar.output", unit="W")

    @property
    def state(self) -> float | None:
        return self.coordinator.data


class BatteryLevelSensor(Entity):
    def __init__(self, client: SolarClient) -> None:
        super().__init__("solar.battery_level", unit="%")
        self._client = client
        self._level: int | None = None

    @property
    def state(self) -> int | None:
        return self._level

    async def keep_fresh(self) -> None:
        # The battery moves slowly; once every ten minutes is plenty.
        while True:
            self._level = await self._client.get_battery_level()
            self.state_changed()
            await asyncio.sleep(600)


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = SolarClient(hub.http, config["base_url"])
    coordinator = PollingCoordinator(
        hub,
        name="solar",
        update_method=client.get_output,
        update_interval=timedelta(seconds=30),
    )
    await coordinator.async_refresh()
    hub.add_entity(SolarOutputSensor(coordinator))

    battery = BatteryLevelSensor(client)
    hub.add_entity(battery)
    task = asyncio.ensure_future(battery.keep_fresh())
    hub.on_stop(task.cancel)
