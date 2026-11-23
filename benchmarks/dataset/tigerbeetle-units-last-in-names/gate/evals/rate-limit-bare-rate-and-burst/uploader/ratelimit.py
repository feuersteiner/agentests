"""A token bucket that keeps the uploader inside Depot's request limit."""

import time


class RateLimiter:
    """Lets `rate` requests through each second on average, and up to `burst` back to back
    after a quiet spell."""

    def __init__(self, rate: float, burst: int, clock=time.monotonic, sleep=time.sleep):
        self.rate = rate
        self.burst = burst
        self.clock = clock
        self.sleep = sleep
        self.tokens = float(burst)
        self.refilled_s = clock()

    def acquire(self) -> None:
        """Waits until one more request may go out, then takes its token."""
        now_s = self.clock()
        self.tokens = min(float(self.burst), self.tokens + (now_s - self.refilled_s) * self.rate)
        self.refilled_s = now_s
        if self.tokens < 1:
            wait_s = (1 - self.tokens) / self.rate
            self.sleep(wait_s)
            self.tokens = 1.0
            self.refilled_s = self.clock()
        self.tokens -= 1
