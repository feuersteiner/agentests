"""The current time, in one place so tests can pass their own."""

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
