"""Client for the solar inverter's local API."""

from __future__ import annotations

import asyncio
from typing import Any

ATTEMPTS = 3


class SolarClient:
    def __init__(self, http: Any, base_url: str) -> None:
        self._http = http
        self._base_url = base_url

    async def _get(self, path: str) -> Any:
        """GET a path. The inverter drops the first request after it wakes, so try up to 3 times."""
        attempt = 0
        while True:
            attempt += 1
            try:
                return await self._http.get_json(f"{self._base_url}{path}")
            except OSError:
                if attempt == ATTEMPTS:
                    raise
                await asyncio.sleep(0.5)

    async def get_output(self) -> float:
        """Return what the panels produce right now, in watts."""
        status = await self._get("/status")
        return float(status["output_w"])

    async def get_battery_level(self) -> int:
        """Return the charge of the inverter's battery, in percent from 0 to 100."""
        battery = await self._get("/battery")
        return int(battery["level_pct"])
