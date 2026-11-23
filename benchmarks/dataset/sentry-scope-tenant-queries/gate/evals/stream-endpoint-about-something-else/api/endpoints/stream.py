"""Server-sent updates for the build status page."""

from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()

_shutdown = asyncio.Event()
_subscribers: set[asyncio.Queue[dict]] = set()


class Event:
    """One line of the stream."""

    def __init__(self, name: str, payload: dict):
        self.name = name
        self.payload = payload

    def encode(self) -> str:
        return f"event: {self.name}\ndata: {json.dumps(self.payload)}\n\n"


def publish(name: str, payload: dict) -> None:
    for queue in _subscribers:
        queue.put_nowait({"name": name, "payload": payload})


async def _lines() -> AsyncIterator[str]:
    queue: asyncio.Queue[dict] = asyncio.Queue()
    _subscribers.add(queue)
    try:
        while not _shutdown.is_set():
            item = await queue.get()
            yield Event(item["name"], item["payload"]).encode()
    finally:
        _subscribers.discard(queue)


@router.get("/stream")
async def stream() -> StreamingResponse:
    return StreamingResponse(_lines(), media_type="text/event-stream")
