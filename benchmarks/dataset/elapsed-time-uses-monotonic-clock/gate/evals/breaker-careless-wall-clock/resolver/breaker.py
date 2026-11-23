"""The circuit breaker of one upstream.

Opens after 5 consecutive failures; after 30 seconds it lets a query through
again to see whether the upstream is back.
"""

import time

FAILURE_THRESHOLD = 5
RESET_TIMEOUT = 30


class CircuitBreaker:
    def __init__(self) -> None:
        self.consecutive_failures = 0
        self.opened_at = None

    def allow(self) -> bool:
        """Whether a query may be sent to the upstream now."""
        if self.opened_at is None:
            return True
        if time.time() - self.opened_at >= RESET_TIMEOUT:
            return True  # half-open: let a query through to test the upstream
        return False

    def record_success(self) -> None:
        """The upstream answered."""
        self.consecutive_failures = 0
        self.opened_at = None

    def record_failure(self) -> None:
        """The upstream did not answer."""
        self.consecutive_failures += 1
        if self.consecutive_failures >= FAILURE_THRESHOLD:
            self.opened_at = time.time()
