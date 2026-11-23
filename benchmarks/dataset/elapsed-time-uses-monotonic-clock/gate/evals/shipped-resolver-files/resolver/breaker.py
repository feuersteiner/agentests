"""The circuit breaker of one upstream.

Not implemented yet: the breaker never opens, so every upstream is always tried.
"""


class CircuitBreaker:
    def allow(self) -> bool:
        """Whether a query may be sent to the upstream now."""
        return True

    def record_success(self) -> None:
        """The upstream answered."""

    def record_failure(self) -> None:
        """The upstream did not answer."""
