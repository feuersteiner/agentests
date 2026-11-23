"""The integrations, with their client packages replaced by fakes."""

import asyncio

from pylumen import LightState
from pyweatherapi import CurrentWeather

from hearth.hub import Hub
from hearth.integrations import lumen, weather


class FakeWeatherApi:
    def __init__(self, session, api_key):
        self.api_key = api_key
        self.locations = []

    async def current(self, location):
        self.locations.append(location)
        return CurrentWeather(temperature=4.5, humidity=81, wind_speed=3.2)


def test_weather_shows_the_temperature(monkeypatch):
    monkeypatch.setattr(weather, "WeatherApi", FakeWeatherApi)
    hub = Hub(session=object())

    asyncio.run(weather.async_setup(hub, {"api_key": "k", "location": "Ashford"}))
    asyncio.run(hub.async_refresh())

    assert hub.states() == {"weather.temperature": 4.5}
    assert hub.get("weather.temperature").unit == "°C"


class FakeLumenController:
    def __init__(self, session, host, api_key):
        self.light = LightState(on=True, brightness=180)
        self.powered = []

    async def get_light(self):
        return self.light

    async def set_power(self, on):
        self.powered.append(on)


def test_lumen_reads_and_switches_the_light(monkeypatch):
    monkeypatch.setattr(lumen, "LumenController", FakeLumenController)
    hub = Hub(session=object())
    asyncio.run(lumen.async_setup(hub, {"host": "10.0.0.5", "api_key": "k", "name": "kitchen"}))
    light = hub.get("lumen.kitchen")

    asyncio.run(hub.async_refresh())
    assert hub.states() == {"lumen.kitchen": "on"}
    assert light.brightness == 180

    asyncio.run(light.async_turn_off())
    assert light._controller.powered == [False]
    assert hub.states() == {"lumen.kitchen": "off"}
