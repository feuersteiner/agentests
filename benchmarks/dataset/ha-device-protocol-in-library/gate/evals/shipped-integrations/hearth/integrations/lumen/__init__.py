"""Lumen: the kitchen light strip, switched through its controller."""

from __future__ import annotations

from typing import Any

from pylumen import LumenController

from hearth.entity import SwitchEntity
from hearth.hub import Hub


class LumenLight(SwitchEntity):
    def __init__(self, controller: LumenController, name: str) -> None:
        super().__init__(f"lumen.{name}")
        self._controller = controller
        self.brightness: int | None = None

    async def async_update(self) -> None:
        light = await self._controller.get_light()
        self.is_on = light.on
        self.brightness = light.brightness

    async def async_turn_on(self) -> None:
        await self._controller.set_power(True)
        self.is_on = True

    async def async_turn_off(self) -> None:
        await self._controller.set_power(False)
        self.is_on = False


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    controller = LumenController(hub.session, host=config["host"], api_key=config["api_key"])
    hub.add_entity(LumenLight(controller, config["name"]))
