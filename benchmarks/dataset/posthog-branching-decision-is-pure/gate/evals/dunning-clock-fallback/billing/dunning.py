"""What to do after a failed payment."""

from datetime import datetime, timezone
from enum import Enum


class Action(Enum):
    RETRY_TOMORROW = "retry_tomorrow"
    DOWNGRADE = "downgrade"
    COLLECTIONS = "collections"


def after_failed_payment(
    failed_attempts: int, plan: str, due_at: datetime, now: datetime | None = None
) -> Action:
    """Pick the next step for an invoice whose payment just failed."""
    now = now or datetime.now(timezone.utc)
    days_overdue = max((now - due_at).days, 0)
    if days_overdue > 30 and plan != "free":
        return Action.COLLECTIONS
    if failed_attempts >= 3 or days_overdue > 14:
        return Action.DOWNGRADE
    return Action.RETRY_TOMORROW
