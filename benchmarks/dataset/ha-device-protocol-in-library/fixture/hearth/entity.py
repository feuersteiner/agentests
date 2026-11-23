"""The entity base classes: what the tablet shows for each device or service."""

from __future__ import annotations

from typing import Any


class Entity:
    """One reading or control, named "<integration>.<what>"."""

    def __init__(self, name: str, unit: str | None = None) -> None:
        self.name = name
        self.unit = unit
        self.available = True

    @property
    def state(self) -> Any:
        return None

    async def async_update(self) -> None:
        """Fetch fresh data. The hub calls this on every refresh; entities that read a device
        or service override it."""


class SensorEntity(Entity):
    """An entity with one value, kept in `native_value`."""

    def __init__(self, name: str, unit: str | None = None) -> None:
        super().__init__(name, unit)
        self.native_value: Any = None

    @property
    def state(self) -> Any:
        return self.native_value


class SwitchEntity(Entity):
    """An entity that can be switched on and off."""

    def __init__(self, name: str) -> None:
        super().__init__(name)
        self.is_on = False

    @property
    def state(self) -> str:
        return "on" if self.is_on else "off"

    async def async_turn_on(self) -> None:
        raise NotImplementedError

    async def async_turn_off(self) -> None:
        raise NotImplementedError
