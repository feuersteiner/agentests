"""A retry decorator for flaky calls."""

import functools
import time


def retry(times: int = 3, delay: float = 0.5, exceptions: tuple = (Exception,)):
    def decorate(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    if attempt == times:
                        raise
                    time.sleep(delay * attempt)

        return wrapper

    return decorate
