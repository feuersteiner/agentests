"""Export unpaid invoices as CSV: python3 tools/export_invoices.py demo.db --out open.csv"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from billing import repo  # noqa: E402


def to_rows(invoices: list[repo.Invoice]) -> list[list[str]]:
    return [
        [
            str(invoice.id),
            str(invoice.customer_id),
            str(invoice.amount_cents // 100),
            invoice.due_at.date().isoformat(),
        ]
        for invoice in invoices
    ]


def export(database: str, out: str) -> int:
    conn = repo.connect(database)
    rows = to_rows(repo.unpaid_invoices(conn))
    conn.close()
    with open(out, "w", newline="") as handle:
        csv.writer(handle).writerows(rows)
    return len(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export unpaid invoices as CSV.")
    parser.add_argument("database")
    parser.add_argument("--out", default="unpaid.csv")
    args = parser.parse_args()
    print(f"Wrote {export(args.database, args.out)} invoice(s) to {args.out}")
