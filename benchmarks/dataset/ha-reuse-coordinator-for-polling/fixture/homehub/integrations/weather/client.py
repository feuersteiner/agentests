"""Client for the weather service."""

from __future__ import annotations

from typing import Any


class WeatherClient:
    def __init__(self, http: Any, base_url: str, location: str) -> None:
        self._http = http
        self._url = f"{base_url}/current?location={location}"

    async def get_current(self) -> dict[str, Any]:
        """Return the current conditions, such as {'temperature': 11.5, 'humidity': 80}."""
        return await self._http.get_json(self._url)
