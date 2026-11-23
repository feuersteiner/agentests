"""Sends a query to an upstream over UDP and waits for its answer."""

import socket

from .upstreams import Upstream


class UpstreamError(Exception):
    """The upstream did not answer in time, or its answer was unusable."""


class UdpTransport:
    def query(self, upstream: Upstream, packet: bytes, timeout_s: float) -> bytes:
        family = socket.AF_INET6 if ":" in upstream.address else socket.AF_INET
        with socket.socket(family, socket.SOCK_DGRAM) as sock:
            sock.settimeout(timeout_s)
            try:
                sock.sendto(packet, (upstream.address, upstream.port))
                answer, _ = sock.recvfrom(4096)
            except OSError as exc:
                raise UpstreamError(f"{upstream.label}: {exc}") from exc
        if answer[:2] != packet[:2]:
            raise UpstreamError(f"{upstream.label}: the answer's id does not match the query")
        return answer
