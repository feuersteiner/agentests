"""The operations the admin console calls."""

import sqlite3
from datetime import datetime, timedelta, timezone

from billing import repo
from billing.plans import FREE, INVOICE_DUE_DAYS, PLANS, TRIAL_DAYS


def sign_up(conn: sqlite3.Connection, email: str) -> int:
    """Create a customer on the free plan, with a trial and an active subscription."""
    now = datetime.now(timezone.utc)
    customer_id = repo.add_customer(conn, email, FREE.name, now, now + timedelta(days=TRIAL_DAYS))
    repo.add_subscription(conn, customer_id, FREE.name)
    return customer_id


def change_plan(conn: sqlite3.Connection, customer_id: int, plan: str) -> None:
    """Move a customer to another plan."""
    repo.set_plan(conn, customer_id, PLANS[plan].name)


def open_invoice(conn: sqlite3.Connection, customer_id: int) -> int:
    """Bill a customer one month of their plan."""
    customer = repo.get_customer(conn, customer_id)
    due_at = datetime.now(timezone.utc) + timedelta(days=INVOICE_DUE_DAYS)
    return repo.add_invoice(conn, customer_id, PLANS[customer.plan].price_cents, due_at)


def record_payment(conn: sqlite3.Connection, invoice_id: int) -> None:
    """Mark an invoice as paid now."""
    repo.mark_invoice_paid(conn, invoice_id, datetime.now(timezone.utc))


def open_ticket(conn: sqlite3.Connection, customer_id: int, subject: str) -> int:
    """File a support ticket for a customer."""
    return repo.add_ticket(conn, customer_id, subject.strip())


def account_summary(conn: sqlite3.Connection, customer_id: int) -> dict:
    """What the admin console shows at the top of a customer's page."""
    customer = repo.get_customer(conn, customer_id)
    unpaid = repo.unpaid_invoices(conn, customer_id)
    return {
        "email": customer.email,
        "plan": customer.plan,
        "projects": repo.count_projects(conn, customer_id),
        "unpaid_invoices": len(unpaid),
        "unpaid_cents": sum(invoice.amount_cents for invoice in unpaid),
        "failed_attempts": sum(invoice.failed_attempts for invoice in unpaid),
    }


def handle_failed_payment(conn: sqlite3.Connection, invoice_id: int) -> str:
    """Record a failed payment and take the next step for the invoice."""
    repo.add_failed_attempt(conn, invoice_id)
    invoice = repo.get_invoice(conn, invoice_id)
    customer = repo.get_customer(conn, invoice.customer_id)
    days_overdue = (datetime.now(timezone.utc) - invoice.due_at).days

    if days_overdue > 30 and customer.plan != FREE.name:
        repo.send_to_collections(conn, invoice_id)
        return "collections"
    if invoice.failed_attempts >= 3 or days_overdue > 14:
        repo.set_plan(conn, customer.id, FREE.name)
        return "downgrade"
    repo.schedule_retry(conn, invoice_id, datetime.now(timezone.utc) + timedelta(days=1))
    return "retry"
