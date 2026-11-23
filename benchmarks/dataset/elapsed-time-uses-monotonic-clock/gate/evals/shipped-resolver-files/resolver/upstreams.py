"""The upstream resolvers the forwarder relays queries to."""

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

    def choose(self) -> Upstream:
        """The upstream for the next query.

        This is the first upstream whose breaker lets a query through, so the
        others only take over while it is out. When every breaker is open, it
        is the first upstream anyway.
        """
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
        return [
            {"upstream": u.label, "queries": u.queries, "failures": u.failures}
            for u in self.upstreams
        ]
