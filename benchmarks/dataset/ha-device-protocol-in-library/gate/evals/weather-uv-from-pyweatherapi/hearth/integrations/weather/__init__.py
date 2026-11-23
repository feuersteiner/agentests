"""Weather: the outdoor temperature and UV index from the Skycast weather service."""

from __future__ import annotations

from typing import Any

from pyweatherapi import WeatherApi

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
    def __init__(self, api: WeatherApi, location: str) -> None:
        super().__init__("weather.uv_index")
        self._api = api
        self._location = location

    async def async_update(self) -> None:
        current = await self._api.current(self._location)
        self.native_value = current.uv_index


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    api = WeatherApi(hub.session, api_key=config["api_key"])
    hub.add_entity(TemperatureSensor(api, config["location"]))
    hub.add_entity(UvIndexSensor(api, config["location"]))
