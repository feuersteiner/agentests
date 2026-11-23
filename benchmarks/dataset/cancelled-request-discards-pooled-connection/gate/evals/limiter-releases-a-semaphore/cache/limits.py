"""Caps how many cache requests one handler may have in flight at once."""

import asyncio


class InFlightLimit:
    def __init__(self, limit: int = 4) -> None:
        self._slots = asyncio.Semaphore(limit)
        self.waited = 0

    async def __aenter__(self) -> "InFlightLimit":
        if self._slots.locked():
            self.waited += 1
        await self._slots.acquire()
        return self

    async def __aexit__(self, *exc_info) -> None:
        self._slots.release()
