"""Stand-ins for the upstream resolvers, so the tests need no network."""

import io
import json
import time

from resolver.message import FLAG_QR, HEADER
from resolver.transport import UpstreamError


def answer_for(query: bytes, rcode: int = 0) -> bytes:
    """A minimal answer to `query`: the same packet, with QR and `rcode` set."""
    msg_id, flags, *counts = HEADER.unpack_from(query)
    return HEADER.pack(msg_id, flags | FLAG_QR | rcode, *counts) + query[HEADER.size :]


class FakeTransport:
    """Answers every query, `delays[address]` seconds later when a delay is set.

    `fail_next(address, n)` makes the next n queries to that upstream fail.
    """

    def __init__(self, delays: dict[str, float] | None = None):
        self.delays = delays or {}
        self.failures: dict[str, int] = {}
        self.sent: list[tuple[str, bytes]] = []

    def fail_next(self, address: str, times: int = 1) -> None:
        self.failures[address] = self.failures.get(address, 0) + times

    def query(self, upstream, packet: bytes, timeout_s: float) -> bytes:
        self.sent.append((upstream.address, packet))
        if self.failures.get(upstream.address, 0) > 0:
            self.failures[upstream.address] -= 1
            raise UpstreamError(f"{upstream.label}: timed out")
        delay = self.delays.get(upstream.address)
        if delay:
            time.sleep(delay)
        return answer_for(packet)


class DenyClients:
    """A rate limiter that refuses the clients it is given and allows all others."""

    def __init__(self, *clients: str):
        self.clients = set(clients)

    def allow(self, client: str) -> bool:
        return client not in self.clients


def read_log(buffer: io.StringIO) -> list[dict]:
    return [json.loads(line) for line in buffer.getvalue().splitlines()]
