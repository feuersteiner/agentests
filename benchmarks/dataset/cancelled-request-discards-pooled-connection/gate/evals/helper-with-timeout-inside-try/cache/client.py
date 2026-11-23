"""The cache client the handlers use: one method per cache command."""

import asyncio

from cache.connection import ReplyError
from cache.pool import Pool


class CacheClient:
    def __init__(self, pool: Pool, get_timeout_seconds: float = 0.2) -> None:
        self._pool = pool
        self._get_timeout_seconds = get_timeout_seconds

    async def get(self, key: str) -> bytes | None:
        """Return the value stored under key, or None when the key is not set."""
        return await self._execute("GET", key, timeout=self._get_timeout_seconds)

    async def set(self, key: str, value: str | bytes, ttl_seconds: int | None = None) -> None:
        """Store value under key, expiring after ttl_seconds when it is given."""
        args: list[str | bytes | int] = ["SET", key, value]
        if ttl_seconds is not None:
            args += ["EX", ttl_seconds]
        await self._execute(*args)

    async def delete(self, key: str) -> int:
        """Remove key and return how many keys were removed: 1, or 0 when it was not set."""
        return await self._execute("DEL", key)

    async def _execute(self, *args: str | bytes | int, timeout: float | None = None):
        conn = await self._pool.acquire()
        try:
            async with asyncio.timeout(timeout):
                await conn.send(*args)
                reply = await conn.read_reply()
        except ReplyError:
            self._pool.release(conn)
            raise
        except BaseException:
            await self._pool.discard(conn)
            raise
        self._pool.release(conn)
        return reply
