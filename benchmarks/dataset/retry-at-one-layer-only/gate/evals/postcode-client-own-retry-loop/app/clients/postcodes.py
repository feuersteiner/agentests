"""Client for the postcode lookup service, which checks a delivery address."""

from __future__ import annotations

import time

from app.http import HTTPError, Session, TransportError

POSTCODES_URL = "http://postcodes.internal/v1"


class PostcodeClient:
    def __init__(self, base_url: str = POSTCODES_URL) -> None:
        # A session of its own, without retries; lookups are retried below.
        self.session = Session(retry=None, timeout=1.0)
        self.base_url = base_url

    def is_deliverable(self, postcode: str) -> bool:
        compact = postcode.replace(" ", "").upper()
        for attempt in range(3):
            try:
                response = self.session.get(f"{self.base_url}/postcodes/{compact}")
                return response.json()["deliverable"]
            except TransportError:
                if attempt == 2:
                    raise
            except HTTPError as exc:
                if exc.status < 500 or attempt == 2:
                    raise
            time.sleep(0.2 * 2**attempt)
        return False
