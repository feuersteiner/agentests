"""The upstream resolvers the forwarder relays queries to."""

import time
from collections.abc import Iterable
from dataclasses import dataclass, field

from .breaker import CircuitBreaker

DEFAULT_PORT = 53


@dataclass
class Upstream:
    address: str
    port: int = DEFAULT_PORT
    queries: int = 0
    failures: int = 0
    srtt_s: float | None = None  # smoothed round-trip time; not tracked yet
    breaker: CircuitBreaker = field(default_factory=CircuitBreaker)

    @property
    def label(self) -> str:
        return f"{self.address}:{self.port}"


def parse_upstream(entry: str) -> Upstream:
    """An upstream from `address` or `address:port`."""
    address, _, port = entry.partition(":")
    return Upstream(address, int(port) if port else DEFAULT_PORT)


class UpstreamPool:
    def __init__(self, entries: Iterable[str]):
        self.upstreams = [parse_upstream(entry) for entry in entries]
        if not self.upstreams:
            raise ValueError("at least one upstream is needed")
        self.started_s = time.monotonic()

    def choose(self) -> Upstream:
        """The first upstream whose breaker lets a query through, else the first."""
        for upstream in self.upstreams:
            if upstream.breaker.allow():
                return upstream
        return self.upstreams[0]

    def record_success(self, upstream: Upstream) -> None:
        upstream.queries += 1
        upstream.breaker.record_success()

    def record_failure(self, upstream: Upstream) -> None:
        upstream.queries += 1
        upstream.failures += 1
        upstream.breaker.record_failure()

    def stats(self) -> list[dict]:
        uptime_s = time.monotonic() - self.started_s
        return [
            {
                "upstream": u.label,
                "queries": u.queries,
                "failures": u.failures,
                "queries_per_s": round(u.queries / uptime_s, 2),
            }
            for u in self.upstreams
        ]
