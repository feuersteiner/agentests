"""The subscription lifecycle: active, past_due, paused and cancelled."""

import sqlite3
from datetime import datetime, timezone

from billing import repo

GRACE_DAYS = 21

# (current status, event) -> next status
TRANSITIONS = {
    ("active", "payment_failed"): "past_due",
    ("active", "pause_requested"): "paused",
    ("active", "cancel_requested"): "cancelled",
    ("past_due", "payment_received"): "active",
    ("past_due", "grace_expired"): "cancelled",
    ("past_due", "cancel_requested"): "cancelled",
    ("paused", "resume_requested"): "active",
    ("paused", "cancel_requested"): "cancelled",
}


class TransitionNotAllowed(ValueError):
    pass


def next_status(status: str, event: str) -> str:
    """The status a subscription moves to when an event happens."""
    try:
        return TRANSITIONS[(status, event)]
    except KeyError:
        raise TransitionNotAllowed(f"{event} is not allowed while {status}") from None


def grace_expired(status: str, oldest_unpaid_due_at: datetime | None, now: datetime) -> bool:
    """Whether a past-due subscription has run out of grace."""
    if status != "past_due" or oldest_unpaid_due_at is None:
        return False
    return (now - oldest_unpaid_due_at).days > GRACE_DAYS


def apply_event(conn: sqlite3.Connection, subscription_id: int, event: str) -> str:
    """Move a subscription to the status the event leads to, and store it."""
    subscription = repo.get_subscription(conn, subscription_id)
    status = next_status(subscription.status, event)
    repo.set_subscription_status(conn, subscription_id, status)
    return status


def expire_overdue(conn: sqlite3.Connection, subscription_id: int) -> bool:
    """Cancel a past-due subscription whose oldest unpaid invoice is past the grace period."""
    subscription = repo.get_subscription(conn, subscription_id)
    unpaid = repo.unpaid_invoices(conn, subscription.customer_id)
    oldest_due_at = unpaid[0].due_at if unpaid else None
    expired = grace_expired(subscription.status, oldest_due_at, datetime.now(timezone.utc))
    if expired:
        apply_event(conn, subscription_id, "grace_expired")
    return expired
