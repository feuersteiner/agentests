"""A small pool of cache connections, shared by every request of the process."""

import asyncio
from collections import deque
from collections.abc import Awaitable, Callable

from cache.connection import Connection


class Pool:
    def __init__(self, connect: Callable[[], Awaitable[Connection]], max_size: int = 8) -> None:
        if max_size < 1:
            raise ValueError("max_size must be at least 1")
        self._connect = connect
        self._max_size = max_size
        self._idle: list[Connection] = []
        self._open = 0
        self._waiters: deque[asyncio.Future[None]] = deque()

    @property
    def open_count(self) -> int:
        """Connections that are open, idle or in use."""
        return self._open

    @property
    def idle_count(self) -> int:
        return len(self._idle)

    async def acquire(self) -> Connection:
        """Hand out an idle connection, open a new one, or wait until one comes back."""
        while not self._idle and self._open >= self._max_size:
            waiter = asyncio.get_running_loop().create_future()
            self._waiters.append(waiter)
            try:
                await waiter
            finally:
                if waiter in self._waiters:
                    self._waiters.remove(waiter)
        if self._idle:
            return self._idle.pop()
        self._open += 1
        try:
            return await self._connect()
        except BaseException:
            self._open -= 1
            self._wake_one()
            raise

    def release(self, conn: Connection) -> None:
        """Put a connection back, for the next acquire() to hand out again."""
        self._idle.append(conn)
        self._wake_one()

    async def discard(self, conn: Connection) -> None:
        """Close a connection and free its place in the pool."""
        self._open -= 1
        self._wake_one()
        await conn.close()

    async def close(self) -> None:
        """Close the idle connections."""
        while self._idle:
            conn = self._idle.pop()
            self._open -= 1
            await conn.close()

    def _wake_one(self) -> None:
        while self._waiters:
            waiter = self._waiters.popleft()
            if not waiter.done():
                waiter.set_result(None)
                return
