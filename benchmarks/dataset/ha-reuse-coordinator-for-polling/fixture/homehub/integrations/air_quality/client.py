"""Client for the air quality service."""

from __future__ import annotations

from typing import Any


class AirQualityClient:
    def __init__(self, http: Any, base_url: str, station: str) -> None:
        self._http = http
        self._url = f"{base_url}/stations/{station}/latest"

    async def get_index(self) -> int:
        """Return the station's latest air quality index, from 0 (clean) to 500."""
        reading = await self._http.get_json(self._url)
        return int(reading["aqi"])
