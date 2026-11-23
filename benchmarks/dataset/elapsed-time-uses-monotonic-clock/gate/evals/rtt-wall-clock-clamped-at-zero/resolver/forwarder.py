"""Relays each client query to an upstream, and the upstream's answer back."""

import logging
import time

from .message import (
    HEADER,
    MalformedMessage,
    Rcode,
    answer_rcode,
    error_response,
    parse_question,
)
from .querylog import QueryLog
from .ratelimit import RateLimiter
from .transport import UpstreamError
from .upstreams import UpstreamPool

log = logging.getLogger(__name__)


class Forwarder:
    def __init__(
        self,
        pool: UpstreamPool,
        transport,
        limiter: RateLimiter,
        querylog: QueryLog,
        timeout_s: float,
    ):
        self.pool = pool
        self.transport = transport
        self.limiter = limiter
        self.querylog = querylog
        self.timeout_s = timeout_s

    def handle(self, client: str, packet: bytes) -> bytes | None:
        """The answer to send back to `client`, or None to drop the packet."""
        try:
            question = parse_question(packet)
        except MalformedMessage as exc:
            log.info("malformed query from %s: %s", client, exc)
            if len(packet) < HEADER.size:
                return None
            return error_response(packet, Rcode.FORMERR)

        if not self.limiter.allow(client):
            self.querylog.write(client, question.name, question.type_name, None, "REFUSED")
            return error_response(packet, Rcode.REFUSED, question)

        upstream = self.pool.choose()
        start = time.time()
        try:
            answer = self.transport.query(upstream, packet, self.timeout_s)
        except UpstreamError as exc:
            log.warning("%s %s failed: %s", question.name, question.type_name, exc)
            self.pool.record_failure(upstream)
            self.querylog.write(
                client, question.name, question.type_name, upstream.label, "SERVFAIL"
            )
            return error_response(packet, Rcode.SERVFAIL, question)
        rtt_s = max(0.0, time.time() - start)  # never negative
        self.pool.record_success(upstream, rtt_s)
        self.querylog.write(
            client, question.name, question.type_name, upstream.label, answer_rcode(answer)
        )
        return answer
