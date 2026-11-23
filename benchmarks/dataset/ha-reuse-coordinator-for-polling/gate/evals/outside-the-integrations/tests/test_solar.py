import asyncio


def test_refreshes_twice():
    async def scenario():
        calls = []
        while len(calls) < 2:
            calls.append(1)
            await asyncio.sleep(0.01)
        return calls

    assert asyncio.run(scenario()) == [1, 1]
