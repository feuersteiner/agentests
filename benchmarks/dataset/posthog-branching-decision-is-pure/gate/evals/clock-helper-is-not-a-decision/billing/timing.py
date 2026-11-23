"""Timing helpers for the admin console's slow-operation log."""

import time
from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def elapsed_ms(started: float) -> int:
    """Milliseconds since `started`, a time.time() value; never negative."""
    elapsed = time.time() - started
    return int(elapsed * 1000) if elapsed > 0 else 0
