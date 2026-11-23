"""Async client for the Skycast weather API.

Pass a session whose `request(method, url, *, body=None, headers=None)` coroutine returns the
decoded JSON body, such as Hearth's `HttpSession`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol
from urllib.parse import urlencode

__all__ = ["CurrentWeather", "Session", "WeatherApi", "WeatherApiError"]

DEFAULT_BASE_URL = "https://api.skycast.example"


class Session(Protocol):
    async def request(
        self, method: str, url: str, *, body: Any = None, headers: dict[str, str] | None = None
    ) -> Any: ...


class WeatherApiError(Exception):
    """Skycast answered with an error instead of data."""


@dataclass(frozen=True)
class CurrentWeather:
    """The conditions now at one place."""

    temperature: float
    """Air temperature in °C."""
    humidity: int
    """Relative humidity in percent."""
    wind_speed: float
    """Wind speed in m/s."""


class WeatherApi:
    def __init__(self, session: Session, api_key: str, base_url: str = DEFAULT_BASE_URL) -> None:
        self._session = session
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    async def current(self, location: str) -> CurrentWeather:
        """Return the conditions now at `location`, a place name or "lat,lon"."""
        data = await self._get("/v2/current", q=location)
        return CurrentWeather(
            temperature=float(data["temp_c"]),
            humidity=int(data["humidity"]),
            wind_speed=float(data["wind_ms"]),
        )

    async def _get(self, path: str, **params: str) -> dict[str, Any]:
        url = f"{self._base_url}{path}?{urlencode(params)}"
        data = await self._session.request("GET", url, headers={"X-Api-Key": self._api_key})
        if "error" in data:
            raise WeatherApiError(data["error"]["message"])
        return data
