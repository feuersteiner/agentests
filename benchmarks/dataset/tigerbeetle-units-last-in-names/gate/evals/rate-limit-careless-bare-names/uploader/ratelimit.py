"""Token bucket rate limiter."""

import time


class RateLimiter:
    def __init__(self, rate: float, burst: int, clock=time.monotonic, sleep=time.sleep):
        self.rate = rate
        self.burst = burst
        self.clock = clock
        self.sleep = sleep
        self.tokens = float(burst)
        self.last = clock()

    def acquire(self) -> None:
        now = self.clock()
        self.tokens = min(float(self.burst), self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens < 1:
            wait = (1 - self.tokens) / self.rate
            self.sleep(wait)
            self.tokens = 1.0
            self.last = self.clock()
        self.tokens -= 1
