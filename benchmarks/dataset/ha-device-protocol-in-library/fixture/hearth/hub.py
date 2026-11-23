"""The hub: holds the entities, refreshes them and owns the HTTP session."""

from __future__ import annotations

from typing import Any

from hearth.entity import Entity
from hearth.http import HttpSession


class Hub:
    def __init__(self, session: Any = None) -> None:
        self.session = session if session is not None else HttpSession()
        self._entities: dict[str, Entity] = {}

    def add_entity(self, entity: Entity) -> None:
        self._entities[entity.name] = entity

    def get(self, name: str) -> Entity:
        return self._entities[name]

    def states(self) -> dict[str, Any]:
        """Return each entity's state by name; an unavailable entity's state is None."""
        return {
            name: entity.state if entity.available else None
            for name, entity in self._entities.items()
        }

    async def async_refresh(self) -> None:
        """Ask every entity to fetch fresh data."""
        for entity in self._entities.values():
            await entity.async_update()
            entity.available = True
