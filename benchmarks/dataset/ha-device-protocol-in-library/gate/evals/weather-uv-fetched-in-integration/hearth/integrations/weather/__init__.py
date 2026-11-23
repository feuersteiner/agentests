"""Weather: the outdoor temperature and UV index from the Skycast weather service."""

from __future__ import annotations

from typing import Any

from pyweatherapi import DEFAULT_BASE_URL, WeatherApi

from hearth.entity import SensorEntity
from hearth.hub import Hub


class TemperatureSensor(SensorEntity):
    def __init__(self, api: WeatherApi, location: str) -> None:
        super().__init__("weather.temperature", unit="°C")
        self._api = api
        self._location = location

    async def async_update(self) -> None:
        current = await self._api.current(self._location)
        self.native_value = current.temperature


class UvIndexSensor(SensorEntity):
    """pyweatherapi does not parse the uv field yet, so read it from /v2/current directly."""

    def __init__(self, hub: Hub, api_key: str, location: str) -> None:
        super().__init__("weather.uv_index")
        self._session = hub.session
        self._api_key = api_key
        self._location = location

    async def async_update(self) -> None:
        data = await self._session.request(
            "GET",
            f"{DEFAULT_BASE_URL}/v2/current?q={self._location}",
            headers={"X-Api-Key": self._api_key},
        )
        self.native_value = float(data["uv"])


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    api = WeatherApi(hub.session, api_key=config["api_key"])
    hub.add_entity(TemperatureSensor(api, config["location"]))
    hub.add_entity(UvIndexSensor(hub, config["api_key"], config["location"]))
