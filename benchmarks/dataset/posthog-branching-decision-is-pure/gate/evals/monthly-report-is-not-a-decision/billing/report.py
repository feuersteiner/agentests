"""The month-end revenue report the finance team downloads."""

import csv
import sqlite3
from datetime import datetime, timezone

from billing import repo


def money(cents: int) -> str:
    sign = "-" if cents < 0 else ""
    return f"{sign}{abs(cents) // 100}.{abs(cents) % 100:02d}"


def write_report(conn: sqlite3.Connection, out: str) -> int:
    """Write one line per unpaid invoice, stamped with the time the report ran."""
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    invoices = repo.unpaid_invoices(conn)
    with open(out, "w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["generated_at", "invoice_id", "customer", "amount", "due_on"])
        for invoice in invoices:
            customer = repo.get_customer(conn, invoice.customer_id)
            writer.writerow(
                [
                    generated_at,
                    invoice.id,
                    customer.email,
                    money(invoice.amount_cents),
                    invoice.due_at.date().isoformat(),
                ]
            )
    return len(invoices)
