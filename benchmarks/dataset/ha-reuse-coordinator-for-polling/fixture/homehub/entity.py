"""Entity base classes."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Callable

if TYPE_CHECKING:
    from homehub.coordinator import PollingCoordinator


class Entity:
    """One reading on the display, such as a temperature."""

    def __init__(self, name: str, unit: str | None = None) -> None:
        self.name = name
        self.unit = unit
        self._change_callbacks: list[Callable[[], None]] = []

    @property
    def state(self) -> Any:
        raise NotImplementedError

    @property
    def available(self) -> bool:
        return True

    def on_change(self, callback: Callable[[], None]) -> None:
        """Register a callback the display runs when the state changes."""
        self._change_callbacks.append(callback)

    def state_changed(self) -> None:
        for callback in self._change_callbacks:
            callback()


class CoordinatorEntity(Entity):
    """An entity whose state comes from a PollingCoordinator's data."""

    def __init__(
        self, coordinator: PollingCoordinator, name: str, unit: str | None = None
    ) -> None:
        super().__init__(name, unit)
        self.coordinator = coordinator
        coordinator.add_listener(self.state_changed)

    @property
    def available(self) -> bool:
        return self.coordinator.last_update_success
