"""Small formatting helpers shared by the serializers."""

from __future__ import annotations

from datetime import datetime


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def str_id(value: int | None) -> str | None:
    return str(value) if value is not None else None
