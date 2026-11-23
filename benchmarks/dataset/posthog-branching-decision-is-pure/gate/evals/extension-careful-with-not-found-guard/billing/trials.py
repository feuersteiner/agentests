"""Trial extensions."""

import sqlite3
from datetime import datetime, timedelta, timezone

from billing import repo
from billing.plans import FREE

MAX_SIGNUP_AGE = timedelta(days=30)
MAX_PROJECTS = 3
EXTENSION = timedelta(days=14)


class UnknownCustomer(LookupError):
    pass


def trial_extension_allowed(
    plan: str, signed_up_at: datetime, now: datetime, had_extension: bool, project_count: int
) -> bool:
    """Whether a customer may get their trial extended."""
    if plan != FREE.name:
        return False
    if now - signed_up_at >= MAX_SIGNUP_AGE:
        return False
    if had_extension:
        return False
    return project_count < MAX_PROJECTS


def extend_trial(conn: sqlite3.Connection, customer_id: int) -> bool:
    """Extend the trial when the customer is eligible. Returns whether it was extended."""
    row = conn.execute("SELECT 1 FROM customers WHERE id = ?", (customer_id,)).fetchone()
    if row is None:
        raise UnknownCustomer(customer_id)
    customer = repo.get_customer(conn, customer_id)
    now = datetime.now(timezone.utc)
    project_count = repo.count_projects(conn, customer_id)
    if not trial_extension_allowed(
        customer.plan, customer.signed_up_at, now, customer.trial_extended, project_count
    ):
        return False
    repo.set_trial_end(conn, customer_id, customer.trial_ends_at + EXTENSION)
    return True
