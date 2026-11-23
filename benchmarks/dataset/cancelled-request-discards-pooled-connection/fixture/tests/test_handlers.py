import asyncio
import json

from app.handlers import DEFAULT_SETTINGS, Handlers
from app.store import ProfileStore
from tests.fakes import FakeCache, make_client

ADA = {"id": 7, "name": "Ada Lovelace", "handle": "ada"}


def _handlers(store: ProfileStore, cache: FakeCache | None = None) -> tuple[Handlers, FakeCache]:
    cache = cache or FakeCache()
    client, _ = make_client(cache)
    return Handlers(client, store), cache


def test_profile_is_loaded_once_and_then_served_from_the_cache():
    store = ProfileStore(profiles={7: ADA})
    handlers, cache = _handlers(store)

    async def main():
        return await handlers.get_profile(7), await handlers.get_profile(7)

    assert asyncio.run(main()) == (ADA, ADA)
    assert store.loads == 1
    assert json.loads(cache.data["profile:7"]) == ADA
    assert cache.ttls["profile:7"] == 600


def test_unknown_user_has_no_profile():
    handlers, cache = _handlers(ProfileStore())
    assert asyncio.run(handlers.get_profile(404)) is None
    assert "profile:404" not in cache.data


def test_cache_error_falls_back_to_the_store():
    store = ProfileStore(profiles={7: ADA})
    cache = FakeCache()
    cache.wrong_type.add("profile:7")
    handlers, _ = _handlers(store, cache)
    assert asyncio.run(handlers.get_profile(7)) == ADA


def test_user_without_settings_gets_the_defaults():
    handlers, cache = _handlers(ProfileStore())
    assert asyncio.run(handlers.get_settings(7)) == DEFAULT_SETTINGS
    assert json.loads(cache.data["settings:7"]) == DEFAULT_SETTINGS
