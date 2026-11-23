"""One JSON line per answered query, for the edge node's log shipper."""

import json
import time
from typing import TextIO


class QueryLog:
    def __init__(self, out: TextIO | None):
        self.out = out

    def write(
        self,
        client: str,
        name: str,
        qtype: str,
        upstream: str | None,
        rcode: str,
        rtt_s: float | None = None,
    ) -> None:
        if self.out is None:
            return
        record = {
            "ts": round(time.time(), 3),  # Unix time, for the log shipper
            "client": client,
            "name": name,
            "type": qtype,
            "upstream": upstream,
            "rcode": rcode,
            "rtt_ms": None if rtt_s is None else round(rtt_s * 1000, 1),
        }
        self.out.write(json.dumps(record) + "\n")
        self.out.flush()
