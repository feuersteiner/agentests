import time


def wait_until(condition):
    """Wait for `condition()` to become true."""
    while True:
        if condition():
            return
        time.sleep(0.01)
