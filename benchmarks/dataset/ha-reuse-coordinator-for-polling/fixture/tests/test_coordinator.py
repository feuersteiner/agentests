import asyncio
from datetime import timedelta

from helpers import FakeHttp

from homehub.coordinator import PollingCoordinator
from homehub.hub import Hub

TICK = timedelta(milliseconds=10)


def test_refreshes_on_the_interval_and_tells_listeners():
    async def scenario():
        hub = Hub(FakeHttp({}))
        values = iter(range(100))

        async def update():
            return next(values)

        coordinator = PollingCoordinator(hub, name="t", update_method=update, update_interval=TICK)
        seen = []
        coordinator.add_listener(lambda: seen.append(coordinator.data))
        await coordinator.async_refresh()
        await asyncio.sleep(0.055)
        await hub.async_stop()
        return seen

    seen = asyncio.run(scenario())

    assert seen[:3] == [0, 1, 2]


def test_failed_update_keeps_data_and_backs_off():
    async def scenario():
        hub = Hub(FakeHttp({}))
        calls = []

        async def update():
            calls.append(1)
            if len(calls) > 1:
                raise OSError("unreachable")
            return "ok"

        coordinator = PollingCoordinator(
            hub, name="t", update_method=update, update_interval=TICK, max_backoff=TICK * 4
        )
        await coordinator.async_refresh()
        await asyncio.sleep(0.1)
        await hub.async_stop()
        return coordinator, len(calls)

    coordinator, calls = asyncio.run(scenario())

    assert coordinator.data == "ok"
    assert coordinator.last_update_success is False
    # Without backoff there would be about ten fetches in this time.
    assert 3 <= calls <= 6


def test_stopping_the_hub_stops_the_fetches():
    async def scenario():
        hub = Hub(FakeHttp({}))
        calls = []

        async def update():
            calls.append(1)

        coordinator = PollingCoordinator(hub, name="t", update_method=update, update_interval=TICK)
        await coordinator.async_refresh()
        await hub.async_stop()
        await asyncio.sleep(0.04)
        return len(calls)

    assert asyncio.run(scenario()) == 1
