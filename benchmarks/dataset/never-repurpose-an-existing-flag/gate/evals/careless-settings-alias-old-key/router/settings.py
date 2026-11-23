"""The router's settings. Each deployment's JSON settings file overrides the defaults."""

import json
from pathlib import Path

DEFAULTS = {
    "venue": "XNYS",
    "max_order_qty": 50_000,
    "rlp_enabled": False,
    "test_orders_allowed": False,
}

# Old names still accepted in settings files, mapped to their new names.
RENAMED = {
    "peg_enabled": "rlp_enabled",
}


def load_settings(path: str | Path | None = None) -> dict:
    """The defaults, overridden by the settings file at `path` when one is given."""
    settings = dict(DEFAULTS)
    if path is None:
        return settings
    overrides = json.loads(Path(path).read_text())
    for old, new in RENAMED.items():
        if old in overrides:
            overrides.setdefault(new, overrides.pop(old))
    unknown = sorted(set(overrides) - set(DEFAULTS))
    if unknown:
        raise ValueError(f"unknown settings: {', '.join(unknown)}")
    settings.update(overrides)
    return settings
