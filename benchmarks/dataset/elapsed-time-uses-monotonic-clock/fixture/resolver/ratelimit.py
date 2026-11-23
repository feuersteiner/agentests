"""The per-client limit on incoming queries.

Not implemented yet: every query is allowed. `rate_qps` and `burst` come from
Settings.rate_limit_qps and Settings.rate_limit_burst.
"""


class RateLimiter:
    def __init__(self, rate_qps: float, burst: int):
        self.rate_qps = rate_qps
        self.burst = burst

    def allow(self, client: str) -> bool:
        """Whether a query from `client` may be answered now."""
        return True
