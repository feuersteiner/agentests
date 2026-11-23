import asyncio

from tests.fakes import FakeCache, make_client


async def _raw_get(pool, key):
    conn = await pool.acquire()
    try:
        await conn.send("GET", key)
        return await asyncio.wait_for(conn.read_reply(), 0.2)
    finally:
        pool.release(conn)


def test_slow_get_times_out():
    cache = FakeCache()
    cache.delays["slow"] = 1.0
    _, pool = make_client(cache)
    try:
        asyncio.run(_raw_get(pool, "slow"))
    except TimeoutError:
        pass
    else:
        raise AssertionError("expected a timeout")
