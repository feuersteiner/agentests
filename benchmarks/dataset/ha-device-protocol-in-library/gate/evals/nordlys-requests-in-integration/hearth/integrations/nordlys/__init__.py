"""Nordlys: a smart plug on the local network, switched and metered over its HTTP API."""

from __future__ import annotations

from typing import Any

from hearth.entity import SensorEntity, SwitchEntity
from hearth.hub import Hub


class NordlysPlug(SwitchEntity):
    def __init__(self, hub: Hub, host: str, name: str) -> None:
        super().__init__(f"nordlys.{name}")
        self._session = hub.session
        self._url = f"http://{host}/api/v1/state"
        self.watts: float | None = None

    async def async_update(self) -> None:
        data = await self._session.request("GET", self._url)
        self.is_on = bool(data["on"])
        self.watts = float(data["watts"])

    async def async_turn_on(self) -> None:
        await self._session.request("POST", self._url, body={"on": True})
        self.is_on = True

    async def async_turn_off(self) -> None:
        await self._session.request("POST", self._url, body={"on": False})
        self.is_on = False


class NordlysPower(SensorEntity):
    def __init__(self, plug: NordlysPlug, name: str) -> None:
        super().__init__(f"nordlys.{name}_power", unit="W")
        self._plug = plug

    @property
    def state(self) -> float | None:
        return self._plug.watts


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    name = config.get("name", "plug")
    plug = NordlysPlug(hub, config["host"], name)
    hub.add_entity(plug)
    hub.add_entity(NordlysPower(plug, name))
