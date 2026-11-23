"""The subscription lifecycle: active, past_due, paused and cancelled."""

import sqlite3
from datetime import datetime, timezone

from billing import repo

GRACE_DAYS = 21


def payment_failed(conn: sqlite3.Connection, subscription_id: int) -> None:
    subscription = repo.get_subscription(conn, subscription_id)
    if subscription.status != "active":
        raise ValueError(f"cannot mark a {subscription.status} subscription past due")
    repo.set_subscription_status(conn, subscription_id, "past_due")


def payment_received(conn: sqlite3.Connection, subscription_id: int) -> None:
    subscription = repo.get_subscription(conn, subscription_id)
    if subscription.status == "past_due":
        repo.set_subscription_status(conn, subscription_id, "active")


def pause(conn: sqlite3.Connection, subscription_id: int) -> None:
    subscription = repo.get_subscription(conn, subscription_id)
    if subscription.status != "active":
        raise ValueError("only an active subscription can be paused")
    repo.set_subscription_status(conn, subscription_id, "paused")


def resume(conn: sqlite3.Connection, subscription_id: int) -> None:
    subscription = repo.get_subscription(conn, subscription_id)
    if subscription.status != "paused":
        raise ValueError("only a paused subscription can be resumed")
    repo.set_subscription_status(conn, subscription_id, "active")


def expire_if_overdue(conn: sqlite3.Connection, subscription_id: int) -> None:
    subscription = repo.get_subscription(conn, subscription_id)
    unpaid = repo.unpaid_invoices(conn, subscription.customer_id)
    if subscription.status == "past_due" and unpaid:
        if (datetime.now(timezone.utc) - unpaid[0].due_at).days > GRACE_DAYS:
            repo.set_subscription_status(conn, subscription_id, "cancelled")


def cancel(conn: sqlite3.Connection, subscription_id: int) -> None:
    subscription = repo.get_subscription(conn, subscription_id)
    if subscription.status == "cancelled":
        raise ValueError("the subscription is already cancelled")
    repo.set_subscription_status(conn, subscription_id, "cancelled")
