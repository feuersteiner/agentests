"""One JSON line per answered query, for the edge node's log shipper."""

import json
from datetime import datetime, timezone
from typing import TextIO


class QueryLog:
    def __init__(self, out: TextIO | None):
        self.out = out

    def write(self, client: str, name: str, qtype: str, upstream: str | None, rcode: str) -> None:
        if self.out is None:
            return
        record = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "client": client,
            "name": name,
            "type": qtype,
            "upstream": upstream,
            "rcode": rcode,
        }
        self.out.write(json.dumps(record) + "\n")
        self.out.flush()
