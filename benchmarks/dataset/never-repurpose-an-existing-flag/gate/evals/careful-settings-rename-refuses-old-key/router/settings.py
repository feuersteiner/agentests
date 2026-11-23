"""The router's settings. Each deployment's JSON settings file overrides the defaults."""

import json
from pathlib import Path

DEFAULTS = {
    "venue": "XNYS",
    "max_order_qty": 50_000,
    "rlp_enabled": False,
    "test_orders_allowed": False,
}

# Settings that no longer exist. A settings file that still has one is refused with the reason,
# so a deployment that was not updated stops at start-up instead of running on a stale setting.
RETIRED = {
    "peg_enabled": "PEG orders were retired; delete this key (RLP orders have their own setting, "
    "rlp_enabled, which is off by default)",
}


def load_settings(path: str | Path | None = None) -> dict:
    """The defaults, overridden by the settings file at `path` when one is given."""
    settings = dict(DEFAULTS)
    if path is None:
        return settings
    overrides = json.loads(Path(path).read_text())
    for key in sorted(set(overrides) & set(RETIRED)):
        raise ValueError(f"retired setting {key}: {RETIRED[key]}")
    unknown = sorted(set(overrides) - set(DEFAULTS))
    if unknown:
        raise ValueError(f"unknown settings: {', '.join(unknown)}")
    settings.update(overrides)
    return settings
