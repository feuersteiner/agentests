"""Sends a query to an upstream over UDP and waits for its answer."""

import random
import socket
import struct

from .upstreams import Upstream

_ID = struct.Struct("!H")


class UpstreamError(Exception):
    """The upstream did not answer in time, or its answer was unusable."""


class UdpTransport:
    def query(self, upstream: Upstream, packet: bytes, timeout_s: float) -> bytes:
        # Send the query upstream under a random id, so a spoofed answer has to
        # guess it, and give the client back the id it chose.
        client_id = packet[:2]
        upstream_id = _ID.pack(random.SystemRandom().randrange(0x10000))
        family = socket.AF_INET6 if ":" in upstream.address else socket.AF_INET
        with socket.socket(family, socket.SOCK_DGRAM) as sock:
            sock.settimeout(timeout_s)
            try:
                sock.sendto(upstream_id + packet[2:], (upstream.address, upstream.port))
                answer, _ = sock.recvfrom(4096)
            except OSError as exc:
                raise UpstreamError(f"{upstream.label}: {exc}") from exc
        if answer[:2] != upstream_id:
            raise UpstreamError(f"{upstream.label}: the answer's id does not match the query")
        return client_id + answer[2:]
