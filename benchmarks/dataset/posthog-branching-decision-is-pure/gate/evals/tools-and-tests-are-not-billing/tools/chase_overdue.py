"""Print what to do about each unpaid invoice: python3 tools/chase_overdue.py demo.db"""

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from billing import repo  # noqa: E402


def next_step(conn, invoice_id: int) -> str:
    invoice = repo.get_invoice(conn, invoice_id)
    customer = repo.get_customer(conn, invoice.customer_id)
    days_overdue = (datetime.now(timezone.utc) - invoice.due_at).days
    if days_overdue > 30 and customer.plan != "free":
        return "collections"
    if invoice.failed_attempts >= 3:
        return "downgrade"
    return "remind"


if __name__ == "__main__":
    conn = repo.connect(sys.argv[1])
    for invoice in repo.unpaid_invoices(conn):
        print(invoice.id, next_step(conn, invoice.id))
