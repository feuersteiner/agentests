"""The circuit breaker of one upstream.

It opens after FAILURES_TO_OPEN failures in a row. While it is open the
upstream gets no queries; RETRY_AFTER_S later, queries go through again to
test it, and the first answer closes the breaker.
"""

import logging
import time
from datetime import datetime, timezone

FAILURES_TO_OPEN = 5
RETRY_AFTER_S = 30.0

log = logging.getLogger(__name__)


class CircuitBreaker:
    def __init__(self, name: str = "upstream") -> None:
        self.name = name
        self.failures = 0
        self.opened_s: float | None = None  # time.monotonic() when it opened
        self.opened_at: datetime | None = None  # when it opened, for logs and stats

    def allow(self) -> bool:
        """Whether a query may be sent to the upstream now."""
        if self.opened_s is None:
            return True
        return time.monotonic() - self.opened_s >= RETRY_AFTER_S

    def record_success(self) -> None:
        """The upstream answered."""
        if self.opened_at is not None:
            log.info("breaker for %s closed (open since %s)", self.name, self.opened_at.isoformat())
        self.failures = 0
        self.opened_s = None
        self.opened_at = None

    def record_failure(self) -> None:
        """The upstream did not answer."""
        self.failures += 1
        if self.failures >= FAILURES_TO_OPEN:
            self.opened_s = time.monotonic()
            self.opened_at = datetime.now(timezone.utc)
            log.warning("breaker for %s opened after %d failures", self.name, self.failures)
