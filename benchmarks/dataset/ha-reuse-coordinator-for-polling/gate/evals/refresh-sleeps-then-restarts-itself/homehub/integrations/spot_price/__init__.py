"""Spot price: the electricity price of the hour that starts next."""

from __future__ import annotations

import asyncio
from typing import Any

from homehub.entity import Entity
from homehub.hub import Hub
from homehub.integrations.spot_price.client import SpotPriceClient

REFRESH_SECONDS = 15 * 60


class NextHourPriceSensor(Entity):
    def __init__(self, client: SpotPriceClient) -> None:
        super().__init__("spot_price.next_hour", unit="EUR/kWh")
        self._client = client
        self._price: float | None = None
        self._stopped = False

    @property
    def state(self) -> float | None:
        return self._price

    def stop(self) -> None:
        self._stopped = True

    async def refresh(self) -> None:
        self._price = await self._client.get_next_hour_price()
        self.state_changed()
        await asyncio.sleep(REFRESH_SECONDS)
        if not self._stopped:
            asyncio.get_running_loop().create_task(self.refresh())


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = SpotPriceClient(hub.http, config["base_url"], config["area"])
    sensor = NextHourPriceSensor(client)
    hub.add_entity(sensor)
    hub.on_stop(sensor.stop)
    asyncio.get_running_loop().create_task(sensor.refresh())
