"""The current time, in one place so tests can pin it."""

from datetime import datetime, timezone


def now() -> datetime:
    """The current time in UTC."""
    return datetime.now(timezone.utc)


def timestamp() -> str:
    """The current time as an ISO 8601 string, as the database stores it."""
    return now().isoformat(timespec="seconds")


def today() -> str:
    """Today's date in UTC as YYYY-MM-DD."""
    return now().date().isoformat()
