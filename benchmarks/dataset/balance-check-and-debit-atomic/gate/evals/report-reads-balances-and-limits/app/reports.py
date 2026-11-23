"""Back-office reports: who holds credit, and which coupons are used up."""

from app import db
from app.money import format_cents


def credit_report() -> list[str]:
    """One line per customer holding credit, largest balance first."""
    rows = db.connection().execute(
        "SELECT name, credit_cents FROM users WHERE credit_cents > 0 ORDER BY credit_cents DESC"
    ).fetchall()
    return [f"{row['name']}: {format_cents(row['credit_cents'])}" for row in rows]


def total_credit_outstanding() -> int:
    """All customers' credit together, in pence: what the shop owes in prepaid work."""
    row = db.connection().execute("SELECT COALESCE(SUM(credit_cents), 0) AS total FROM users").fetchone()
    return row["total"]


def used_up_coupons() -> list[str]:
    """The codes of coupons that have reached their usage limit."""
    rows = db.connection().execute(
        "SELECT code FROM coupons WHERE usage_limit IS NOT NULL AND times_used >= usage_limit"
        " ORDER BY code"
    ).fetchall()
    return [row["code"] for row in rows]
