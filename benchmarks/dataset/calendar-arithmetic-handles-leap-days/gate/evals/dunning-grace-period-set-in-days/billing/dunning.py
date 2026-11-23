"""What happens after a charge fails."""

from datetime import date, timedelta

# We retry a failed charge every 3 days and suspend the sites 30 days after the first failure.
RETRY_EVERY = timedelta(days=3)
GRACE_PERIOD_DAYS = 30


def next_retry_on(last_attempt_on: date) -> date:
    """The day we try a failed charge again."""
    return last_attempt_on + RETRY_EVERY


def suspend_on(first_failed_on: date) -> date:
    """The day the customer's sites are suspended if the charge still fails."""
    return first_failed_on + timedelta(days=GRACE_PERIOD_DAYS)


def is_past_grace_period(first_failed_on: date, today: date) -> bool:
    """True once 30 days have passed since the first failure."""
    return (today - first_failed_on).days >= GRACE_PERIOD_DAYS
