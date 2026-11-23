"""The router's settings. Each deployment's JSON settings file overrides the defaults."""

import json
from pathlib import Path

DEFAULTS = {
    "venue": "XNYS",
    "max_order_qty": 50_000,
    "peg_enabled": False,
    "rlp_enabled": False,
    "test_orders_allowed": False,
}


def load_settings(path: str | Path | None = None) -> dict:
    """The defaults, overridden by the settings file at `path` when one is given."""
    settings = dict(DEFAULTS)
    if path is None:
        return settings
    overrides = json.loads(Path(path).read_text())
    unknown = sorted(set(overrides) - set(DEFAULTS))
    if unknown:
        raise ValueError(f"unknown settings: {', '.join(unknown)}")
    settings.update(overrides)
    return settings
