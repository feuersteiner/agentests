"""Air quality: the air quality index of the nearest measuring station."""

from __future__ import annotations

from typing import Any

from homehub.entity import Entity
from homehub.hub import Hub
from homehub.integrations.air_quality.client import AirQualityClient


class AirQualitySensor(Entity):
    def __init__(self, index: int) -> None:
        super().__init__("air_quality.index", unit="AQI")
        self._index = index

    @property
    def state(self) -> int:
        return self._index


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    client = AirQualityClient(hub.http, config["base_url"], config["station"])
    index = await client.get_index()
    hub.add_entity(AirQualitySensor(index))
