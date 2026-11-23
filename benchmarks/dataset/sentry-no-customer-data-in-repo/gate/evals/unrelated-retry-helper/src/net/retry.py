"""Retry a call with exponential backoff."""

import random
import time
from functools import wraps


def retry(attempts: int = 3, base_delay: float = 0.2, retry_on: tuple = (ConnectionError, TimeoutError)):
    """Call the function again after a failure, waiting longer each time, with jitter."""

    def decorate(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            for attempt in range(1, attempts + 1):
                try:
                    return function(*args, **kwargs)
                except retry_on:
                    if attempt == attempts:
                        raise
                    time.sleep(base_delay * 2 ** (attempt - 1) * random.uniform(0.5, 1.5))

        return wrapper

    return decorate
