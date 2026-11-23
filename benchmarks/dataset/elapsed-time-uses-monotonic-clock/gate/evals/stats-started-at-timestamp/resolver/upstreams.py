"""The upstream resolvers the forwarder relays queries to."""

from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .breaker import CircuitBreaker

DEFAULT_PORT = 53
RTT_SMOOTHING = 0.125


@dataclass
class Upstream:
    address: str
    port: int = DEFAULT_PORT
    queries: int = 0
    failures: int = 0
    srtt_s: float | None = None  # smoothed round-trip time; None until the first answer
    last_failure: datetime | None = None  # shown in stats() for the on-call engineer
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
        self.started = datetime.now(timezone.utc)

    def choose(self) -> Upstream:
        """The first upstream whose breaker lets a query through, else the first."""
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
        upstream.last_failure = datetime.now(timezone.utc)
        upstream.breaker.record_failure()

    def stats(self) -> list[dict]:
        return [
            {
                "upstream": u.label,
                "since": self.started.isoformat(timespec="seconds"),
                "queries": u.queries,
                "failures": u.failures,
                "last_failure": u.last_failure.isoformat(timespec="seconds")
                if u.last_failure
                else None,
                "srtt_ms": None if u.srtt_s is None else round(u.srtt_s * 1000, 1),
            }
            for u in self.upstreams
        ]
