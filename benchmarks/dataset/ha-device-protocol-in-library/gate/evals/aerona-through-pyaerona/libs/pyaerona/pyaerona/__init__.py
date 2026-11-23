"""Async client for the local API of Aerona air purifiers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

__all__ = ["AeronaAuthError", "AeronaPurifier", "AeronaStatus"]


class AeronaAuthError(Exception):
    """The purifier refused the token."""


@dataclass(frozen=True)
class AeronaStatus:
    fan_speed: int
    fan_max: int
    pm25: float
    """Fine particles in µg/m³."""


class AeronaPurifier:
    def __init__(self, session: Any, host: str, token: str) -> None:
        self._session = session
        self._base_url = f"http://{host}/api"
        self._headers = {"Authorization": f"Bearer {token}"}

    async def get_status(self) -> AeronaStatus:
        data = await self._session.request("GET", f"{self._base_url}/status", headers=self._headers)
        if data is None or "fan" not in data:
            raise AeronaAuthError("The purifier answered without a status")
        return AeronaStatus(
            fan_speed=int(data["fan"]["speed"]),
            fan_max=int(data["fan"]["max"]),
            pm25=float(data["air"]["pm25"]),
        )

    async def set_fan_speed(self, speed: int) -> None:
        await self._session.request(
            "PUT", f"{self._base_url}/fan", body={"speed": speed}, headers=self._headers
        )
