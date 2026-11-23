"""The upstream resolvers the forwarder relays queries to."""

from collections.abc import Iterable
from dataclasses import dataclass, field

from .breaker import CircuitBreaker

DEFAULT_PORT = 53
RTT_SMOOTHING = 0.125  # weight of a new sample in the smoothed RTT


@dataclass
class Upstream:
    address: str
    port: int = DEFAULT_PORT
    queries: int = 0
    failures: int = 0
    srtt_s: float | None = None  # smoothed round-trip time; None until the first answer
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

    def record_success(self, upstream: Upstream, rtt_s: float) -> None:
        upstream.queries += 1
        if upstream.srtt_s is None:
            upstream.srtt_s = rtt_s
        else:
            upstream.srtt_s += RTT_SMOOTHING * (rtt_s - upstream.srtt_s)
        upstream.breaker.record_success()

    def record_failure(self, upstream: Upstream) -> None:
        upstream.queries += 1
        upstream.failures += 1
        upstream.breaker.record_failure()

    def stats(self) -> list[dict]:
        return [
            {
                "upstream": u.label,
                "queries": u.queries,
                "failures": u.failures,
                "srtt_ms": None if u.srtt_s is None else round(u.srtt_s * 1000, 1),
            }
            for u in self.upstreams
        ]
