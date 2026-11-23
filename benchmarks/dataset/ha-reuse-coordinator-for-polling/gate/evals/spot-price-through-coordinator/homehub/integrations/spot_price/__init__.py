"""Spot price: the electricity price of the hour that starts next."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from homehub.coordinator import PollingCoordinator
from homehub.entity import CoordinatorEntity
from homehub.hub import Hub
from homehub.integrations.spot_price.client import SpotPriceClient

# The coming hour changes on the hour, so look often enough to notice soon after.
UPDATE_INTERVAL = timedelta(minutes=5)


class NextHourPriceSensor(CoordinatorEntity):
    def __init__(self, coordinator: PollingCoordinator[float]) -> None:
        super().__init__(coordinator, "spot_price.next_hour", unit="EUR/kWh")

    @property
    def state(self) -> float | None:
        return self.coordinator.data


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = SpotPriceClient(hub.http, config["base_url"], config["area"])
    coordinator = PollingCoordinator(
        hub,
        name="spot_price",
        update_method=client.get_next_hour_price,
        update_interval=UPDATE_INTERVAL,
    )
    await coordinator.async_refresh()
    hub.add_entity(NextHourPriceSensor(coordinator))
