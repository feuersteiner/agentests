"""Ticket routing."""

import sqlite3

from billing import repo

BILLING_WORDS = ("invoice", "refund", "charge", "payment")
SALES_WORDS = ("upgrade", "pricing", "quote")


def route(conn: sqlite3.Connection, ticket_id: int, plan: str, has_unpaid_invoice: bool, subject: str) -> None:
    """Put a ticket in the billing, technical or sales queue."""
    subject = subject.lower()
    if has_unpaid_invoice or any(word in subject for word in BILLING_WORDS):
        repo.set_ticket_queue(conn, ticket_id, "billing")
    elif plan == "free" and any(word in subject for word in SALES_WORDS):
        repo.set_ticket_queue(conn, ticket_id, "sales")
    else:
        repo.set_ticket_queue(conn, ticket_id, "technical")
