"""Aerona: the living-room air purifier's fan speed and PM2.5 reading."""

from __future__ import annotations

from typing import Any

from pyaerona import AeronaAuthError, AeronaPurifier

from hearth.entity import SensorEntity
from hearth.hub import Hub


class FanSpeedSensor(SensorEntity):
    def __init__(self, purifier: AeronaPurifier) -> None:
        super().__init__("aerona.fan_speed")
        self._purifier = purifier
        self.max_speed: int | None = None

    async def async_update(self) -> None:
        status = await self._purifier.get_status()
        self.native_value = status.fan_speed
        self.max_speed = status.fan_max


class Pm25Sensor(SensorEntity):
    def __init__(self, purifier: AeronaPurifier) -> None:
        super().__init__("aerona.pm25", unit="µg/m³")
        self._purifier = purifier

    async def async_update(self) -> None:
        try:
            status = await self._purifier.get_status()
        except AeronaAuthError:
            self.available = False
            raise
        self.native_value = round(status.pm25, 1)


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    purifier = AeronaPurifier(hub.session, host=config["host"], token=config["token"])
    hub.add_entity(FanSpeedSensor(purifier))
    hub.add_entity(Pm25Sensor(purifier))
