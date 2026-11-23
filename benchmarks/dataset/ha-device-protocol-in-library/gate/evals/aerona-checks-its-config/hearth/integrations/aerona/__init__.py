"""Aerona: the living-room air purifier's fan speed and PM2.5 reading."""

from __future__ import annotations

import logging
from typing import Any

from pyaerona import AeronaAuthError, AeronaPurifier

from hearth.entity import SensorEntity
from hearth.hub import Hub

LOGGER = logging.getLogger(__name__)
REQUIRED_KEYS = ("host", "token")


class AeronaSensor(SensorEntity):
    def __init__(self, purifier: AeronaPurifier, name: str, unit: str | None = None) -> None:
        super().__init__(name, unit)
        self._purifier = purifier

    async def async_update(self) -> None:
        try:
            status = await self._purifier.get_status()
        except AeronaAuthError:
            LOGGER.error("The purifier rejected the token: copy a new one from the Aerona app into config.json")
            raise
        self.native_value = self.read(status)

    def read(self, status: Any) -> Any:
        raise NotImplementedError


class FanSpeedSensor(AeronaSensor):
    def read(self, status: Any) -> int:
        return status.fan_speed


class Pm25Sensor(AeronaSensor):
    def read(self, status: Any) -> float:
        return status.pm25


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    missing = [key for key in REQUIRED_KEYS if not config.get(key)]
    if missing:
        raise ValueError(f"Cannot set up aerona as its config lacks: {', '.join(missing)}")
    purifier = AeronaPurifier(hub.session, host=config["host"], token=config["token"])
    hub.add_entity(FanSpeedSensor(purifier, "aerona.fan_speed"))
    hub.add_entity(Pm25Sensor(purifier, "aerona.pm25", unit="µg/m³"))
