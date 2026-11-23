"""The upstream resolvers the forwarder relays queries to."""

import random
from collections.abc import Iterable
from dataclasses import dataclass, field

from .breaker import CircuitBreaker

DEFAULT_PORT = 53
INITIAL_RTT_S = 0.050  # assumed RTT of an upstream with no answer yet
MIN_RTT_S = 0.001  # floor, so a zero or negative RTT cannot break the weights
RTT_SMOOTHING = 0.125


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
        host = f"[{self.address}]" if ":" in self.address else self.address
        return f"{host}:{self.port}"


def parse_upstream(entry: str) -> Upstream:
    """An upstream from `address`, `address:port`, `[ipv6]:port` or a bare IPv6 address."""
    if entry.startswith("["):
        address, _, rest = entry[1:].partition("]")
        port = rest.removeprefix(":")
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
        """A random upstream for the next query, weighted by 1/RTT.

        Faster upstreams get proportionally more queries. Only upstreams whose
        breaker lets a query through take part, unless every breaker is open.
        """
        candidates = [u for u in self.upstreams if u.breaker.allow()] or self.upstreams
        weights = [
            1.0 / max(u.srtt_s if u.srtt_s is not None else INITIAL_RTT_S, MIN_RTT_S)
            for u in candidates
        ]
        return random.choices(candidates, weights=weights, k=1)[0]

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
            {"upstream": u.label, "queries": u.queries, "failures": u.failures}
            for u in self.upstreams
        ]
