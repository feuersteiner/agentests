"""The enactor's settings, read from the environment."""

import os
from collections.abc import Mapping
from dataclasses import dataclass

_UNITS = {"s": 1, "m": 60, "h": 3600}


@dataclass(frozen=True)
class Settings:
    db_path: str
    interval_seconds: float
    dns_url: str
    dns_token: str


def parse_duration(text: str) -> float:
    """Seconds in a duration such as "45", "45s", "5m" or "1h". A bare number is seconds."""
    text = text.strip().lower()
    if not text:
        raise ValueError("empty duration")
    unit = text[-1]
    if unit in _UNITS:
        return float(text[:-1]) * _UNITS[unit]
    return float(text)


def load(env: Mapping[str, str] = os.environ) -> Settings:
    """The settings from `env`. ENACTOR_DNS_URL and ENACTOR_DNS_TOKEN are required."""
    missing = [name for name in ("ENACTOR_DNS_URL", "ENACTOR_DNS_TOKEN") if not env.get(name)]
    if missing:
        raise ValueError(f"missing settings: {', '.join(missing)}")
    return Settings(
        db_path=env.get("ENACTOR_DB", "enactor.sqlite3"),
        interval_seconds=parse_duration(env.get("ENACTOR_INTERVAL", "30s")),
        dns_url=env["ENACTOR_DNS_URL"],
        dns_token=env["ENACTOR_DNS_TOKEN"],
    )
