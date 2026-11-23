"""The circuit breaker of one upstream.

Opens after 5 consecutive failures; 30 seconds later it lets queries through
again to see whether the upstream is back.
"""

from datetime import datetime, timedelta

FAILURES_TO_OPEN = 5
RETRY_AFTER = timedelta(seconds=30)


class CircuitBreaker:
    def __init__(self) -> None:
        self.failures = 0
        self.retry_at: datetime | None = None

    def allow(self) -> bool:
        """Whether a query may be sent to the upstream now."""
        return self.retry_at is None or datetime.now() >= self.retry_at

    def record_success(self) -> None:
        """The upstream answered."""
        self.failures = 0
        self.retry_at = None

    def record_failure(self) -> None:
        """The upstream did not answer."""
        self.failures += 1
        if self.failures >= FAILURES_TO_OPEN:
            self.retry_at = datetime.now() + RETRY_AFTER
