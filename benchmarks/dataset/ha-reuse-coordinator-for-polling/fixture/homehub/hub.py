"""The hub: it holds the entities and runs the stop callbacks."""

from __future__ import annotations

from typing import Any, Callable

from homehub.entity import Entity


class Hub:
    def __init__(self, http: Any) -> None:
        self.http = http
        self._entities: dict[str, Entity] = {}
        self._stop_callbacks: list[Callable[[], None]] = []

    def add_entity(self, entity: Entity) -> None:
        self._entities[entity.name] = entity

    def get_entity(self, name: str) -> Entity:
        return self._entities[name]

    def states(self) -> dict[str, Any]:
        """Return the state of every entity, keyed by entity name."""
        return {name: entity.state for name, entity in self._entities.items()}

    def on_stop(self, callback: Callable[[], None]) -> None:
        """Register a callback to run when the hub stops."""
        self._stop_callbacks.append(callback)

    async def async_stop(self) -> None:
        for callback in self._stop_callbacks:
            callback()
        self._stop_callbacks.clear()
