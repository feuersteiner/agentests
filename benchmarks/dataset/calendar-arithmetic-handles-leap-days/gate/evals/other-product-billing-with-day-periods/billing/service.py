"""Operations the Quillpost admin console calls for a customer."""

import sqlite3
from datetime import datetime, timedelta, timezone

from billing import repo
from billing.plans import PLANS

TRIAL_DAYS = 14
INVOICE_DUE_DAYS = 14


def sign_up(conn: sqlite3.Connection, email: str) -> int:
    """Create a customer on the free plan with a 14-day trial."""
    now = datetime.now(timezone.utc)
    return repo.add_customer(conn, email, "free", now, now + timedelta(days=TRIAL_DAYS))


def open_invoice(conn: sqlite3.Connection, customer_id: int) -> int:
    """Bill a customer one month of their plan, due in 14 days."""
    customer = repo.get_customer(conn, customer_id)
    due_at = datetime.now(timezone.utc) + timedelta(days=INVOICE_DUE_DAYS)
    return repo.add_invoice(conn, customer_id, PLANS[customer.plan].monthly_cents, due_at)


def annual_price_cents(plan: str) -> int:
    """Twelve months of the plan, with two months free."""
    return PLANS[plan].monthly_cents * 10
