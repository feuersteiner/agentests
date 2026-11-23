"""Aerona: the living-room air purifier's fan speed and PM2.5 reading."""

from __future__ import annotations

from typing import Any

from hearth.entity import SensorEntity
from hearth.hub import Hub


class AeronaStatus:
    """Reads the purifier's status with its bearer token."""

    def __init__(self, hub: Hub, host: str, token: str) -> None:
        self._session = hub.session
        self._url = f"http://{host}/api/status"
        self._headers = {"Authorization": f"Bearer {token}"}

    async def fetch(self) -> dict[str, Any]:
        return await self._session.request("GET", self._url, headers=self._headers)


class FanSpeedSensor(SensorEntity):
    def __init__(self, status: AeronaStatus) -> None:
        super().__init__("aerona.fan_speed")
        self._status = status

    async def async_update(self) -> None:
        data = await self._status.fetch()
        self.native_value = data["fan"]["speed"]


class Pm25Sensor(SensorEntity):
    def __init__(self, status: AeronaStatus) -> None:
        super().__init__("aerona.pm25", unit="µg/m³")
        self._status = status

    async def async_update(self) -> None:
        data = await self._status.fetch()
        self.native_value = data["air"]["pm25"]


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    status = AeronaStatus(hub, config["host"], config["token"])
    hub.add_entity(FanSpeedSensor(status))
    hub.add_entity(Pm25Sensor(status))
