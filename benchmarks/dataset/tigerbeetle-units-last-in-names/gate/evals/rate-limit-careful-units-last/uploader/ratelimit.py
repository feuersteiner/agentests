"""A token bucket that keeps the uploader inside Depot's request limit."""

import time


class RateLimiter:
    """Lets `requests_per_s` requests through each second on average, and up to
    `requests_burst_max` back to back after a quiet spell."""

    def __init__(self, requests_per_s: float, requests_burst_max: int, clock=time.monotonic, sleep=time.sleep):
        self.requests_per_s = requests_per_s
        self.requests_burst_max = requests_burst_max
        self.clock = clock
        self.sleep = sleep
        self.tokens = float(requests_burst_max)
        self.refilled_s = clock()

    def acquire(self) -> None:
        """Waits until one more request may go out, then takes its token."""
        now_s = self.clock()
        self.tokens = min(
            float(self.requests_burst_max),
            self.tokens + (now_s - self.refilled_s) * self.requests_per_s,
        )
        self.refilled_s = now_s
        if self.tokens < 1:
            wait_s = (1 - self.tokens) / self.requests_per_s
            self.sleep(wait_s)
            self.tokens = 1.0
            self.refilled_s = self.clock()
        self.tokens -= 1
