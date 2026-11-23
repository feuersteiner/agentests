"""Start the hub and set up the integrations named in the config."""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any

from homehub.http import HttpClient
from homehub.hub import Hub
from homehub.integrations import air_quality, weather

INTEGRATIONS = {
    "weather": weather,
    "air_quality": air_quality,
}


async def async_setup(hub: Hub, config: dict[str, Any]) -> None:
    """Set up every integration that has a section in the config."""
    for name, integration in INTEGRATIONS.items():
        if name in config:
            await integration.async_setup(hub, config[name])


async def main(config_path: str) -> None:
    with open(config_path, encoding="utf-8") as file:
        config = json.load(file)
    hub = Hub(HttpClient())
    await async_setup(hub, config)
    try:
        await asyncio.Event().wait()
    finally:
        await hub.async_stop()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))
