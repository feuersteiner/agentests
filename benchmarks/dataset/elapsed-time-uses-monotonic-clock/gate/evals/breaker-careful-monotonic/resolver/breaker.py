"""The circuit breaker of one upstream.

After FAILURES_TO_OPEN failures in a row the breaker opens and the upstream
gets no queries. Once RETRY_AFTER_S has passed, queries are let through again
to test it: one answer closes the breaker, one more failure opens it again.
"""

import time

FAILURES_TO_OPEN = 5
RETRY_AFTER_S = 30.0


class CircuitBreaker:
    def __init__(self) -> None:
        self.failures = 0
        self.opened_s: float | None = None  # time.monotonic() when the breaker opened

    @property
    def is_open(self) -> bool:
        return self.opened_s is not None

    def allow(self) -> bool:
        """Whether a query may be sent to the upstream now."""
        if self.opened_s is None:
            return True
        return time.monotonic() - self.opened_s >= RETRY_AFTER_S

    def record_success(self) -> None:
        """The upstream answered."""
        self.failures = 0
        self.opened_s = None

    def record_failure(self) -> None:
        """The upstream did not answer."""
        self.failures += 1
        if self.failures >= FAILURES_TO_OPEN:
            self.opened_s = time.monotonic()
