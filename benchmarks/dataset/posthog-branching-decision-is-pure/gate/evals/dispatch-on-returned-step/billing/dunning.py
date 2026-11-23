"""What happens to an invoice after a failed payment."""

import sqlite3
from datetime import datetime, timedelta, timezone

from billing import repo

MAX_ATTEMPTS = 3
DOWNGRADE_AFTER_DAYS = 14
COLLECTIONS_AFTER_DAYS = 30


def next_step(failed_attempts: int, plan: str, days_overdue: int) -> str:
    """Pick "retry", "downgrade" or "collections" for an invoice whose payment just failed."""
    if plan != "free" and days_overdue > COLLECTIONS_AFTER_DAYS:
        return "collections"
    if failed_attempts >= MAX_ATTEMPTS or days_overdue > DOWNGRADE_AFTER_DAYS:
        return "downgrade"
    return "retry"


def handle_failed_payment(conn: sqlite3.Connection, invoice_id: int) -> str:
    """Record the failure, ask next_step what to do, and do it."""
    repo.add_failed_attempt(conn, invoice_id)
    invoice = repo.get_invoice(conn, invoice_id)
    customer = repo.get_customer(conn, invoice.customer_id)
    now = datetime.now(timezone.utc)

    step = next_step(invoice.failed_attempts, customer.plan, (now - invoice.due_at).days)

    if step == "collections":
        repo.send_to_collections(conn, invoice_id, now)
    elif step == "downgrade":
        repo.set_plan(conn, customer.id, "free")
    elif step == "retry":
        repo.schedule_retry(conn, invoice_id, now + timedelta(days=1))
    return step
