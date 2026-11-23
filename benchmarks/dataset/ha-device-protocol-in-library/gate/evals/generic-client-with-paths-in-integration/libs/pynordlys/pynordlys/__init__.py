"""Async client for Nordlys smart plugs."""

from __future__ import annotations

from typing import Any


class NordlysApi:
    def __init__(self, session: Any, host: str) -> None:
        self._session = session
        self._host = host

    async def get(self, path: str) -> Any:
        return await self._session.request("GET", f"http://{self._host}{path}")

    async def post(self, path: str, body: Any) -> Any:
        return await self._session.request("POST", f"http://{self._host}{path}", body=body)
