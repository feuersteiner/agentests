import asyncio

from helpers import FakeHttp

from homehub import app
from homehub.hub import Hub

CONFIG = {
    "weather": {"base_url": "https://weather.test", "location": "larkfield"},
    "air_quality": {"base_url": "https://air.test", "station": "LF-02"},
}
BODIES = {
    "https://weather.test/current?location=larkfield": {"temperature": 11.5, "humidity": 80},
    "https://air.test/stations/LF-02/latest": {"aqi": 42},
}


def test_setup_adds_the_configured_entities():
    async def scenario():
        hub = Hub(FakeHttp(dict(BODIES)))
        await app.async_setup(hub, CONFIG)
        states = hub.states()
        await hub.async_stop()
        return states

    assert asyncio.run(scenario()) == {"weather.temperature": 11.5, "air_quality.index": 42}


def test_an_integration_without_a_config_section_is_skipped():
    async def scenario():
        hub = Hub(FakeHttp(dict(BODIES)))
        await app.async_setup(hub, {"weather": CONFIG["weather"]})
        states = hub.states()
        await hub.async_stop()
        return states

    assert asyncio.run(scenario()) == {"weather.temperature": 11.5}
