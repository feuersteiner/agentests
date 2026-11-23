"""The upstream resolvers the forwarder relays queries to."""

import random
from collections.abc import Iterable
from dataclasses import dataclass, field

from .breaker import CircuitBreaker

DEFAULT_PORT = 53
DEFAULT_RTT = 0.1  # seconds, used until an upstream has answered
RTT_ALPHA = 0.2


@dataclass
class Upstream:
    address: str
    port: int = DEFAULT_PORT
    queries: int = 0
    failures: int = 0
    srtt_s: float | None = None  # smoothed round-trip time
    breaker: CircuitBreaker = field(default_factory=CircuitBreaker)

    @property
    def label(self) -> str:
        if ":" in self.address:
            return f"[{self.address}]:{self.port}"
        return f"{self.address}:{self.port}"


def parse_upstream(entry: str) -> Upstream:
    """An upstream from `address`, `address:port`, `[ipv6]:port` or a bare IPv6 address."""
    if entry.startswith("["):
        address, _, rest = entry[1:].partition("]")
        port = rest[1:] if rest.startswith(":") else ""
        return Upstream(address, int(port) if port else DEFAULT_PORT)
    if entry.count(":") > 1:
        return Upstream(entry)
    address, _, port = entry.partition(":")
    return Upstream(address, int(port) if port else DEFAULT_PORT)


class UpstreamPool:
    def __init__(self, entries: Iterable[str]):
        self.upstreams = [parse_upstream(entry) for entry in entries]
        if not self.upstreams:
            raise ValueError("at least one upstream is needed")

    def choose(self) -> Upstream:
        """The upstream for the next query: a random one, weighted by 1/RTT.

        Upstreams whose breaker is open are skipped, unless all of them are.
        """
        available = [u for u in self.upstreams if u.breaker.allow()] or self.upstreams
        weights = [1.0 / u.srtt_s if u.srtt_s else 1.0 / DEFAULT_RTT for u in available]
        return random.choices(available, weights=weights)[0]

    def record_success(self, upstream: Upstream, rtt: float) -> None:
        upstream.queries += 1
        if upstream.srtt_s is None:
            upstream.srtt_s = rtt
        else:
            upstream.srtt_s = (1 - RTT_ALPHA) * upstream.srtt_s + RTT_ALPHA * rtt
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
