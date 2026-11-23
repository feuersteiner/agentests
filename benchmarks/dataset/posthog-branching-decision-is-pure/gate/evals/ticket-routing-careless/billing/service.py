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


BILLING_WORDS = ("invoice", "refund", "charge", "payment", "receipt")
SALES_WORDS = ("upgrade", "pricing", "quote", "seats", "demo")


def route_ticket(conn: sqlite3.Connection, ticket_id: int) -> str:
    """Send a ticket to the billing, technical or sales queue."""
    ticket = repo.get_ticket(conn, ticket_id)
    subject = ticket.subject.lower()
    if any(word in subject for word in BILLING_WORDS):
        queue = "billing"
    elif repo.unpaid_invoices(conn, ticket.customer_id):
        queue = "billing"
    elif repo.get_customer(conn, ticket.customer_id).plan == FREE.name and any(
        word in subject for word in SALES_WORDS
    ):
        queue = "sales"
    else:
        queue = "technical"
    repo.set_ticket_queue(conn, ticket_id, queue)
    return queue
