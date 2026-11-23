"""Hallway light: switch the light, and blink it to find the right fitting."""

from __future__ import annotations

import asyncio
from typing import Any

from homehub.entity import Entity
from homehub.hub import Hub

IDENTIFY_SECONDS = 5


class HallwayLight(Entity):
    def __init__(self, http: Any, base_url: str) -> None:
        super().__init__("hallway_light.power")
        self._http = http
        self._base_url = base_url
        self._on = False

    @property
    def state(self) -> str:
        return "on" if self._on else "off"

    async def async_turn_on(self) -> None:
        await self._http.get_json(f"{self._base_url}/on")
        self._on = True
        self.state_changed()

    async def async_turn_off(self) -> None:
        await self._http.get_json(f"{self._base_url}/off")
        self._on = False
        self.state_changed()

    async def async_identify(self) -> None:
        """Turn the light on and switch it off again five seconds later."""
        await self.async_turn_on()
        loop = asyncio.get_running_loop()
        loop.call_later(IDENTIFY_SECONDS, lambda: asyncio.ensure_future(self.async_turn_off()))


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    hub.add_entity(HallwayLight(hub.http, config["base_url"]))
