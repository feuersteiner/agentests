import asyncio

import pytest
from pyweatherapi import CurrentWeather, WeatherApi, WeatherApiError


class FakeSession:
    def __init__(self, answer):
        self.answer = answer
        self.requests = []

    async def request(self, method, url, *, body=None, headers=None):
        self.requests.append((method, url, body, headers))
        return self.answer


def test_current_returns_the_conditions():
    session = FakeSession({"temp_c": 4.5, "humidity": 81, "wind_ms": 3.2, "uv": 1.4})
    api = WeatherApi(session, api_key="secret")

    current = asyncio.run(api.current("Ashford"))

    assert current == CurrentWeather(temperature=4.5, humidity=81, wind_speed=3.2)
    assert session.requests == [
        ("GET", "https://api.skycast.example/v2/current?q=Ashford", None, {"X-Api-Key": "secret"})
    ]


def test_an_error_answer_raises():
    session = FakeSession({"error": {"code": 401, "message": "Invalid API key"}})
    api = WeatherApi(session, api_key="wrong")

    with pytest.raises(WeatherApiError, match="Invalid API key"):
        asyncio.run(api.current("Ashford"))
