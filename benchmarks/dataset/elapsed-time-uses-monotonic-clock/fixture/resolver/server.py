"""Runs the forwarder on a UDP socket: python -m resolver.server"""

import logging
import socket

from .config import Settings, load_settings
from .forwarder import Forwarder
from .querylog import QueryLog
from .ratelimit import RateLimiter
from .transport import UdpTransport
from .upstreams import UpstreamPool


def build_forwarder(settings: Settings) -> Forwarder:
    out = open(settings.query_log_path, "a", encoding="utf-8") if settings.query_log_path else None
    return Forwarder(
        pool=UpstreamPool(settings.upstreams),
        transport=UdpTransport(),
        limiter=RateLimiter(settings.rate_limit_qps, settings.rate_limit_burst),
        querylog=QueryLog(out),
        timeout_s=settings.query_timeout_s,
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = load_settings()
    forwarder = build_forwarder(settings)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.bind((settings.listen_host, settings.listen_port))
        logging.info("listening on %s:%s", settings.listen_host, settings.listen_port)
        while True:
            packet, (host, port) = sock.recvfrom(4096)
            answer = forwarder.handle(host, packet)
            if answer is not None:
                sock.sendto(answer, (host, port))


if __name__ == "__main__":
    main()
