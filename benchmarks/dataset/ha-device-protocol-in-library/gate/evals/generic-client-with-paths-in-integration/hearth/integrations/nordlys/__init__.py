"""Nordlys: a smart plug on the local network, as a switch and a power sensor."""

from __future__ import annotations

from typing import Any

from pynordlys import NordlysApi

from hearth.entity import SensorEntity, SwitchEntity
from hearth.hub import Hub

STATE_PATH = "/api/v1/state"


class NordlysSwitch(SwitchEntity):
    def __init__(self, api: NordlysApi, name: str) -> None:
        super().__init__(f"nordlys.{name}")
        self._api = api
        self.watts: float | None = None

    async def async_update(self) -> None:
        state = await self._api.get(STATE_PATH)
        self.is_on = bool(state["on"])
        self.watts = float(state["watts"])

    async def async_turn_on(self) -> None:
        await self._api.post(STATE_PATH, {"on": True})
        self.is_on = True

    async def async_turn_off(self) -> None:
        await self._api.post(STATE_PATH, {"on": False})
        self.is_on = False


class NordlysPower(SensorEntity):
    def __init__(self, switch: NordlysSwitch, name: str) -> None:
        super().__init__(f"nordlys.{name}_power", unit="W")
        self._switch = switch

    @property
    def state(self) -> float | None:
        return self._switch.watts


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    name = config.get("name", "plug")
    switch = NordlysSwitch(NordlysApi(hub.session, host=config["host"]), name)
    hub.add_entity(switch)
    hub.add_entity(NordlysPower(switch, name))
