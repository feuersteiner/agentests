"""What to do after a failed payment."""

from enum import Enum

MAX_ATTEMPTS = 3
DOWNGRADE_AFTER_DAYS = 14
COLLECTIONS_AFTER_DAYS = 30


class Action(Enum):
    RETRY_TOMORROW = "retry_tomorrow"
    DOWNGRADE = "downgrade"
    COLLECTIONS = "collections"


def after_failed_payment(failed_attempts: int, plan: str, days_overdue: int) -> Action:
    """Pick the next step for an invoice whose payment just failed."""
    if days_overdue > COLLECTIONS_AFTER_DAYS and plan != "free":
        return Action.COLLECTIONS
    if failed_attempts >= MAX_ATTEMPTS or days_overdue > DOWNGRADE_AFTER_DAYS:
        return Action.DOWNGRADE
    return Action.RETRY_TOMORROW
