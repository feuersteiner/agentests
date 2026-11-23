"""The per-client limit on incoming queries: one token bucket per client.

A client's bucket holds up to `burst` tokens and refills at `rate_qps` tokens
per second. Each query takes a token; a client with no token left is refused.
The clock can be replaced in tests.
"""

import time
from collections.abc import Callable


class RateLimiter:
    def __init__(self, rate_qps: float, burst: int, clock: Callable[[], float] = time.monotonic):
        self.rate_qps = rate_qps
        self.burst = burst
        self.clock = clock
        self.buckets: dict[str, tuple[float, float]] = {}  # client -> (tokens, updated)

    def allow(self, client: str) -> bool:
        """Whether a query from `client` may be answered now."""
        now = self.clock()
        tokens, updated = self.buckets.get(client, (float(self.burst), now))
        tokens = min(float(self.burst), tokens + (now - updated) * self.rate_qps)
        allowed = tokens >= 1.0
        if allowed:
            tokens -= 1.0
        self.buckets[client] = (tokens, now)
        return allowed
