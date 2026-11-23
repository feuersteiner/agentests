"""The cache client the handlers use: one method per cache command."""

import asyncio

from cache.connection import ReplyError
from cache.pool import Pool


class CacheClient:
    def __init__(self, pool: Pool, get_timeout_seconds: float = 0.2) -> None:
        self._pool = pool
        self._get_timeout_seconds = get_timeout_seconds

    async def get(self, key: str) -> bytes | None:
        """Return the value stored under key, or None when the key is not set.

        Raises TimeoutError when the server takes longer than get_timeout_seconds to answer.
        """
        conn = await self._pool.acquire()
        try:
            await conn.send("GET", key)
            reply = await asyncio.wait_for(conn.read_reply(), self._get_timeout_seconds)
        except ReplyError:
            self._pool.release(conn)
            raise
        except BaseException:
            await self._pool.discard(conn)
            raise
        self._pool.release(conn)
        return reply

    async def set(self, key: str, value: str | bytes, ttl_seconds: int | None = None) -> None:
        """Store value under key, expiring after ttl_seconds when it is given."""
        args: list[str | bytes | int] = ["SET", key, value]
        if ttl_seconds is not None:
            args += ["EX", ttl_seconds]
        conn = await self._pool.acquire()
        try:
            await conn.send(*args)
            await conn.read_reply()
        except ReplyError:
            self._pool.release(conn)
            raise
        except BaseException:
            await self._pool.discard(conn)
            raise
        self._pool.release(conn)

    async def delete(self, key: str) -> int:
        """Remove key and return how many keys were removed: 1, or 0 when it was not set."""
        conn = await self._pool.acquire()
        try:
            await conn.send("DEL", key)
            reply = await conn.read_reply()
        except ReplyError:
            self._pool.release(conn)
            raise
        except BaseException:
            await self._pool.discard(conn)
            raise
        self._pool.release(conn)
        return reply
