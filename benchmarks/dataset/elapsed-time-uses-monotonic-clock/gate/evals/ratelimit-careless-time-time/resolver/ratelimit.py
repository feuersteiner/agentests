"""The per-client limit on incoming queries: one token bucket per client.

A client's bucket holds up to `burst` tokens and refills at `rate_qps` tokens
per second. Each query takes a token; a client with no token left is refused.
"""

import time


class RateLimiter:
    def __init__(self, rate_qps: float, burst: int):
        self.rate_qps = rate_qps
        self.burst = burst
        self.tokens: dict[str, float] = {}
        self.last_seen: dict[str, float] = {}

    def allow(self, client: str) -> bool:
        """Whether a query from `client` may be answered now."""
        now = time.time()
        tokens = self.tokens.get(client, float(self.burst))
        last = self.last_seen.get(client, now)
        tokens = min(float(self.burst), tokens + (now - last) * self.rate_qps)
        self.last_seen[client] = now
        if tokens < 1:
            self.tokens[client] = tokens
            return False
        self.tokens[client] = tokens - 1
        return True
