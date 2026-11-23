"""Starts Hearth: reads the config, sets up the integrations it names and refreshes them."""

from __future__ import annotations

import asyncio
import importlib
import json
import sys
from pathlib import Path
from typing import Any

from hearth.hub import Hub

DEFAULT_REFRESH_SECONDS = 60


def load_config(path: str | Path) -> dict[str, Any]:
    """Read the JSON config: the refresh period and one section per integration."""
    config = json.loads(Path(path).read_text(encoding="utf-8"))
    config.setdefault("refresh_seconds", DEFAULT_REFRESH_SECONDS)
    config.setdefault("integrations", {})
    return config


async def setup(hub: Hub, config: dict[str, Any]) -> None:
    """Set up every integration named in the config's "integrations" section."""
    for name, section in config["integrations"].items():
        module = importlib.import_module(f"hearth.integrations.{name}")
        await module.async_setup(hub, section)


async def run(config: dict[str, Any]) -> None:
    hub = Hub()
    await setup(hub, config)
    while True:
        await hub.async_refresh()
        print(json.dumps(hub.states(), default=str), flush=True)
        await asyncio.sleep(config["refresh_seconds"])


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print("usage: python -m hearth.app CONFIG", file=sys.stderr)
        return 2
    asyncio.run(run(load_config(args[0])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
