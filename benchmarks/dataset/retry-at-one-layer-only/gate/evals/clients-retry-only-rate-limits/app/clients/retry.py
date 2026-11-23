"""Retrying a client call that got one of a few HTTP statuses."""

from __future__ import annotations

import functools
import time

from app.http import HTTPError


def retry_on_status(statuses: tuple[int, ...], attempts: int = 3, delay: float = 1.0):
    """Call again when the call raises an HTTPError with one of `statuses`; anything else is raised."""

    def decorate(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, attempts + 1):
                try:
                    return func(*args, **kwargs)
                except HTTPError as exc:
                    if exc.status not in statuses or attempt == attempts:
                        raise
                    time.sleep(delay * attempt)

        return wrapper

    return decorate
