"""Spot price: the electricity price of the hour that starts next."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

from homehub.entity import Entity
from homehub.hub import Hub
from homehub.integrations.spot_price.client import SpotPriceClient


def _seconds_to_next_hour() -> float:
    now = datetime.now(timezone.utc)
    next_hour = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    return (next_hour - now).total_seconds() + 5


class NextHourPriceSensor(Entity):
    def __init__(self, client: SpotPriceClient) -> None:
        super().__init__("spot_price.next_hour", unit="EUR/kWh")
        self._client = client
        self._price: float | None = None
        self._handle: asyncio.TimerHandle | None = None

    @property
    def state(self) -> float | None:
        return self._price

    async def async_update(self) -> None:
        try:
            self._price = await self._client.get_next_hour_price()
            self.state_changed()
        finally:
            loop = asyncio.get_running_loop()
            self._handle = loop.call_at(loop.time() + _seconds_to_next_hour(), self._fire)

    def _fire(self) -> None:
        asyncio.ensure_future(self.async_update())

    def cancel(self) -> None:
        if self._handle is not None:
            self._handle.cancel()


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = SpotPriceClient(hub.http, config["base_url"], config["area"])
    sensor = NextHourPriceSensor(client)
    await sensor.async_update()
    hub.add_entity(sensor)
    hub.on_stop(sensor.cancel)
