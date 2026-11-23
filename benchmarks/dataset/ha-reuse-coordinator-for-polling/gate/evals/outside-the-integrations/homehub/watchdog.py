"""Logs a line every minute so the Pi's supervisor can see the hub is alive."""

import asyncio
import logging

_LOGGER = logging.getLogger(__name__)


async def heartbeat() -> None:
    while True:
        _LOGGER.info("alive")
        await asyncio.sleep(60)
