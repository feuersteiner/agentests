"""The per-client limit on incoming queries: one token bucket per client.

A client's bucket holds up to `burst` tokens and refills at `rate_qps` tokens
per second. Each query takes a token; a client with no token left is refused.
"""

import time
from dataclasses import dataclass


@dataclass
class _Bucket:
    tokens: float
    updated_s: float  # time.monotonic() when `tokens` was last brought up to date


class RateLimiter:
    def __init__(self, rate_qps: float, burst: int):
        self.rate_qps = rate_qps
        self.burst = burst
        self._buckets: dict[str, _Bucket] = {}

    def allow(self, client: str) -> bool:
        """Whether a query from `client` may be answered now."""
        now_s = time.monotonic()
        bucket = self._buckets.get(client)
        if bucket is None:
            bucket = self._buckets[client] = _Bucket(float(self.burst), now_s)
        else:
            refill = (now_s - bucket.updated_s) * self.rate_qps
            bucket.tokens = min(float(self.burst), bucket.tokens + refill)
            bucket.updated_s = now_s
        if bucket.tokens < 1.0:
            return False
        bucket.tokens -= 1.0
        return True
