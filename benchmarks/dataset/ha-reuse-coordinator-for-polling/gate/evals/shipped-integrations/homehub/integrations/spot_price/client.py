"""Client for the electricity market's day-ahead prices."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


class SpotPriceClient:
    def __init__(self, http: Any, base_url: str, area: str) -> None:
        self._http = http
        self._url = f"{base_url}/day-ahead?area={area}"

    async def get_next_hour_price(self, now: datetime | None = None) -> float:
        """Return the price of the hour that starts next, in euro per kWh."""
        now = now or datetime.now(timezone.utc)
        next_hour = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        prices = await self._http.get_json(self._url)
        return float(prices[next_hour.strftime("%Y-%m-%dT%H:00Z")])
