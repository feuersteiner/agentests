"""Nordlys: a smart plug on the local network, as a switch and a power sensor."""

from __future__ import annotations

from typing import Any

from pynordlys import NordlysPlug

from hearth.entity import SensorEntity, SwitchEntity
from hearth.hub import Hub


class NordlysSwitch(SwitchEntity):
    def __init__(self, plug: NordlysPlug, name: str) -> None:
        super().__init__(f"nordlys.{name}")
        self._plug = plug
        self.watts: float | None = None

    async def async_update(self) -> None:
        data = await self._plug.get_state()
        self.is_on = bool(data["on"])
        self.watts = float(data["watts"])

    async def async_turn_on(self) -> None:
        await self._plug.put_state({"on": True})
        self.is_on = True

    async def async_turn_off(self) -> None:
        await self._plug.put_state({"on": False})
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
    switch = NordlysSwitch(NordlysPlug(hub.session, host=config["host"]), name)
    hub.add_entity(switch)
    hub.add_entity(NordlysPower(switch, name))
