"""The cache client the handlers use: one method per cache command."""

from cache.connection import ReplyError
from cache.pool import Pool


class CacheClient:
    def __init__(self, pool: Pool) -> None:
        self._pool = pool

    async def get(self, key: str) -> bytes | None:
        """Return the value stored under key, or None when the key is not set."""
        conn = await self._pool.acquire()
        try:
            await conn.send("GET", key)
            reply = await conn.read_reply()
        except ReplyError:
            self._pool.release(conn)
            raise
        except BaseException:
            await self._pool.discard(conn)
            raise
        self._pool.release(conn)
        return reply

    async def get_many(self, keys: list[str]) -> list[bytes | None]:
        """Return the values of keys, in order, with None where a key is not set."""
        conn = await self._pool.acquire()
        try:
            for key in keys:
                await conn.send("GET", key)
            values = []
            for _ in keys:
                values.append(await conn.read_reply())
        except ReplyError:
            self._pool.release(conn)
            raise
        except BaseException:
            await self._pool.discard(conn)
            raise
        self._pool.release(conn)
        return values

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
