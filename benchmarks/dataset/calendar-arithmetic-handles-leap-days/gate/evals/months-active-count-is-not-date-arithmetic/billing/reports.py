"""Figures for the monthly finance report."""

from collections import Counter
from datetime import date

from billing.subscriptions import Subscription


def months_active(subscription: Subscription, today: date) -> int:
    """Whole calendar months from the start month to this month, counting the start month as 0."""
    start = subscription.started_on
    return (today.year - start.year) * 12 + (today.month - start.month)


def signups_by_month(subscriptions: list[Subscription]) -> dict[str, int]:
    """How many subscriptions started in each month, keyed "2026-03"."""
    counts = Counter(f"{s.started_on.year}-{s.started_on.month:02d}" for s in subscriptions)
    return dict(sorted(counts.items()))
