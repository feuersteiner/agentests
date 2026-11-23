"""The per-client limit on incoming queries: one token bucket per client."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Bucket:
    tokens: float
    refilled_at: datetime


class RateLimiter:
    def __init__(self, rate_qps: float, burst: int):
        self.rate_qps = rate_qps
        self.burst = burst
        self.buckets: dict[str, Bucket] = {}

    def _refill(self, bucket: Bucket) -> None:
        now = datetime.now()
        elapsed = (now - bucket.refilled_at).total_seconds()
        bucket.tokens = min(self.burst, bucket.tokens + elapsed * self.rate_qps)
        bucket.refilled_at = now

    def allow(self, client: str) -> bool:
        """Whether a query from `client` may be answered now."""
        bucket = self.buckets.setdefault(client, Bucket(self.burst, datetime.now()))
        self._refill(bucket)
        if bucket.tokens >= 1:
            bucket.tokens -= 1
            return True
        return False
