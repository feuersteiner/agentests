import asyncio

import pytest

from cache import Pool, ReplyError
from tests.fakes import FakeCache, make_client


def test_get_returns_the_stored_value():
    cache = FakeCache()
    cache.data["profile:7"] = b'{"name": "Ada"}'
    client, _ = make_client(cache)
    assert asyncio.run(client.get("profile:7")) == b'{"name": "Ada"}'


def test_get_of_a_missing_key_returns_none():
    client, _ = make_client(FakeCache())
    assert asyncio.run(client.get("profile:404")) is None


def test_set_with_ttl_sends_ex():
    cache = FakeCache()
    client, _ = make_client(cache)
    asyncio.run(client.set("settings:7", '{"theme": "dark"}', ttl_seconds=600))
    assert cache.data["settings:7"] == b'{"theme": "dark"}'
    assert cache.ttls["settings:7"] == 600


def test_delete_returns_how_many_keys_were_removed():
    cache = FakeCache()
    cache.data["profile:7"] = b"{}"
    client, _ = make_client(cache)

    async def main():
        return await client.delete("profile:7"), await client.delete("profile:7")

    assert asyncio.run(main()) == (1, 0)


def test_error_reply_is_raised():
    cache = FakeCache()
    cache.wrong_type.add("feed:7")
    client, _ = make_client(cache)
    with pytest.raises(ReplyError, match="WRONGTYPE"):
        asyncio.run(client.get("feed:7"))


def test_sequential_calls_share_one_connection():
    cache = FakeCache()
    client, pool = make_client(cache)

    async def main():
        await client.set("a", "1")
        await client.get("a")
        await client.delete("a")

    asyncio.run(main())
    assert len(cache.connections) == 1
    assert pool.idle_count == 1


def test_pool_waits_when_every_connection_is_in_use():
    cache = FakeCache()
    pool = Pool(cache.connect, max_size=1)

    async def main():
        first = await pool.acquire()
        waiting = asyncio.ensure_future(pool.acquire())
        await asyncio.sleep(0)
        assert not waiting.done()
        pool.release(first)
        second = await waiting
        return first, second

    first, second = asyncio.run(main())
    assert first is second


def test_pool_rejects_a_size_below_one():
    with pytest.raises(ValueError):
        Pool(FakeCache().connect, max_size=0)
