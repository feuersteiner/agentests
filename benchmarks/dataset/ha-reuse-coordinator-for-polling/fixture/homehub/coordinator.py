"""PollingCoordinator: keeps data from a device or API fresh."""

from __future__ import annotations

import asyncio
import logging
from datetime import timedelta
from typing import TYPE_CHECKING, Any, Awaitable, Callable, Generic, TypeVar

if TYPE_CHECKING:
    from homehub.hub import Hub

_LOGGER = logging.getLogger(__name__)

T = TypeVar("T")


class PollingCoordinator(Generic[T]):
    """Fetch data with `update_method` every `update_interval`.

    `async_refresh` fetches once, stores the result in `data`, tells the listeners and plans the
    next fetch. A fetch that raises leaves `data` as it was, sets `last_update_success` to False
    and doubles the wait before the next fetch, up to `max_backoff`; the first fetch that works
    returns to `update_interval`. The coordinator stops when the hub stops.
    """

    def __init__(
        self,
        hub: Hub,
        *,
        name: str,
        update_method: Callable[[], Awaitable[T]],
        update_interval: timedelta,
        max_backoff: timedelta = timedelta(minutes=10),
    ) -> None:
        self.name = name
        self.update_interval = update_interval
        self.max_backoff = max_backoff
        self.data: T | None = None
        self.last_update_success = False
        self.last_error: Exception | None = None
        self._update_method = update_method
        self._listeners: list[Callable[[], None]] = []
        self._failures = 0
        self._timer: asyncio.TimerHandle | None = None
        self._stopped = False
        hub.on_stop(self.async_shutdown)

    def add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Call `listener` after every fetch. Returns a function that removes it."""
        self._listeners.append(listener)

        def remove() -> None:
            self._listeners.remove(listener)

        return remove

    async def async_refresh(self) -> None:
        """Fetch now, tell the listeners and plan the next fetch."""
        self._cancel_timer()
        try:
            self.data = await self._update_method()
        except Exception as error:  # noqa: BLE001 - any failed fetch backs off
            self.last_update_success = False
            self.last_error = error
            self._failures += 1
            delay = min(self.update_interval * 2**self._failures, self.max_backoff)
            _LOGGER.warning("%s: update failed, next try in %s: %s", self.name, delay, error)
        else:
            self.last_update_success = True
            self.last_error = None
            self._failures = 0
            delay = self.update_interval
        self._plan(delay)
        for listener in list(self._listeners):
            listener()

    def async_shutdown(self) -> None:
        """Stop fetching."""
        self._stopped = True
        self._cancel_timer()

    def _plan(self, delay: timedelta) -> None:
        if self._stopped:
            return
        loop = asyncio.get_running_loop()
        self._timer = loop.call_later(delay.total_seconds(), self._on_timer)

    def _on_timer(self) -> None:
        self._timer = None
        self._task: Any = asyncio.ensure_future(self.async_refresh())

    def _cancel_timer(self) -> None:
        if self._timer is not None:
            self._timer.cancel()
            self._timer = None
