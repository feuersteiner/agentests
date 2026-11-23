"""Client for the solar inverter's local API."""

from __future__ import annotations

from typing import Any


class SolarClient:
    def __init__(self, http: Any, base_url: str) -> None:
        self._http = http
        self._base_url = base_url

    async def get_output(self) -> float:
        """Return what the panels produce right now, in watts."""
        status = await self._http.get_json(f"{self._base_url}/status")
        return float(status["output_w"])

    async def get_battery_level(self) -> int:
        """Return the charge of the inverter's battery, in percent from 0 to 100."""
        battery = await self._http.get_json(f"{self._base_url}/battery")
        return int(battery["level_pct"])
