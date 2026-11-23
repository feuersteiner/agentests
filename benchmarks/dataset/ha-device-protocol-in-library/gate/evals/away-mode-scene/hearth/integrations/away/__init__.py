"""Away: one switch that turns off the lights named in the config when we leave the flat."""

from __future__ import annotations

from typing import Any

from hearth.entity import SwitchEntity
from hearth.hub import Hub


class AwaySwitch(SwitchEntity):
    """On/off: on turns every listed light off and remembers which ones were on."""

    def __init__(self, hub: Hub, lights: list[str]) -> None:
        super().__init__("away.mode")
        self._hub = hub
        self._lights = sorted(lights, key=str.lower)
        self._were_on: list[str] = []
        self.attributes: dict[str, Any] = {"lights": self._lights}

    async def async_turn_on(self) -> None:
        self._were_on = [name for name in self._lights if self._hub.get(name).state == "on"]
        for name in self._were_on:
            await self._hub.get(name).async_turn_off()
        self.is_on = True

    async def async_turn_off(self) -> None:
        for name in self._were_on:
            await self._hub.get(name).async_turn_on()
        self._were_on = []
        self.is_on = False


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    hub.add_entity(AwaySwitch(hub, config["lights"]))
