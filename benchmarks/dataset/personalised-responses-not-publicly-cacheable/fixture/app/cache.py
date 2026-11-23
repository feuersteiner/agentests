"""The application cache. In production this is Redis, shared by every web worker; tests and
local runs use the in-memory backend below, which has the same get/setex/delete calls."""

from __future__ import annotations

import time


class MemoryBackend:
    def __init__(self) -> None:
        self._items: dict[str, tuple[str, float]] = {}

    def get(self, key: str) -> str | None:
        item = self._items.get(key)
        if item is None:
            return None
        value, expires_at = item
        if expires_at <= time.monotonic():
            del self._items[key]
            return None
        return value

    def setex(self, key: str, seconds: int, value: str) -> None:
        self._items[key] = (value, time.monotonic() + seconds)

    def delete(self, key: str) -> None:
        self._items.pop(key, None)

    def flushdb(self) -> None:
        self._items.clear()


class Cache:
    def __init__(self, backend) -> None:
        self.backend = backend

    def get(self, key: str) -> str | None:
        return self.backend.get(key)

    def set(self, key: str, value: str, ttl: int) -> None:
        """Store `value` under `key` for `ttl` seconds."""
        self.backend.setex(key, ttl, value)

    def delete(self, key: str) -> None:
        self.backend.delete(key)

    def clear(self) -> None:
        self.backend.flushdb()


cache = Cache(MemoryBackend())
