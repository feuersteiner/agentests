"""The profile endpoints: read through the cache, fall back to the store."""

import json
import logging

from app.store import ProfileStore
from cache import CacheClient, CacheError

log = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 600

DEFAULT_SETTINGS = {
    "theme": "light",
    "language": "en",
    "weekly_digest": True,
}


class Handlers:
    def __init__(self, cache: CacheClient, store: ProfileStore) -> None:
        self._cache = cache
        self._store = store

    async def get_profile(self, user_id: int) -> dict | None:
        """The user's profile, or None when there is no such user."""
        key = f"profile:{user_id}"
        profile = await self._cached(key)
        if profile is None:
            profile = await self._store.load_profile(user_id)
            if profile is not None:
                await self._remember(key, profile)
        return profile

    async def get_settings(self, user_id: int) -> dict:
        """The user's settings, with DEFAULT_SETTINGS filling in what they never changed."""
        key = f"settings:{user_id}"
        settings = await self._cached(key)
        if settings is None:
            stored = await self._store.load_settings(user_id) or {}
            settings = {**stored, **DEFAULT_SETTINGS}
            await self._remember(key, settings)
        return settings

    async def _cached(self, key: str) -> dict | None:
        try:
            raw = await self._cache.get(key)
        except (CacheError, OSError) as error:
            log.warning("cache read of %s failed: %s", key, error)
            return None
        return json.loads(raw) if raw is not None else None

    async def _remember(self, key: str, value: dict) -> None:
        try:
            await self._cache.set(key, json.dumps(value), ttl_seconds=CACHE_TTL_SECONDS)
        except (CacheError, OSError) as error:
            log.warning("cache write of %s failed: %s", key, error)
