"""Account credit: the prepaid balance a customer can spend on invoices."""

from app import clock, db, models
from app.errors import BillingError, NotFound


class InsufficientCredit(BillingError):
    """The customer's credit does not cover the amount."""


class InvoiceNotOpen(BillingError):
    """The invoice is already paid or void."""


def get_balance(user_id: int) -> int:
    """The user's credit in pence."""
    user = models.get_user(user_id)
    if user is None:
        raise NotFound(f"user {user_id}")
    return user.credit_cents


def add_credit(user_id: int, amount_cents: int, reason: str) -> int:
    """Add credit to the user's account, record why, and return the new balance."""
    if amount_cents <= 0:
        raise ValueError("amount_cents must be positive")
    if models.get_user(user_id) is None:
        raise NotFound(f"user {user_id}")
    with db.transaction() as conn:
        conn.execute(
            "UPDATE users SET credit_cents = credit_cents + ? WHERE id = ?",
            (amount_cents, user_id),
        )
        conn.execute(
            "INSERT INTO credit_entries (user_id, amount_cents, reason, created_at)"
            " VALUES (?, ?, ?, ?)",
            (user_id, amount_cents, reason, clock.timestamp()),
        )
    return get_balance(user_id)


def credit_history(user_id: int) -> list[dict]:
    """Every change to the user's credit, oldest first."""
    rows = db.connection().execute(
        "SELECT amount_cents, reason, created_at FROM credit_entries"
        " WHERE user_id = ? ORDER BY id",
        (user_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def pay_with_credit(user_id: int, invoice_id: int) -> None:
    """Pay the user's invoice with their account credit."""
    invoice = models.get_invoice(invoice_id)
    if invoice is None or invoice.user_id != user_id:
        raise NotFound(f"invoice {invoice_id}")
    if invoice.status != "open":
        raise InvoiceNotOpen(f"invoice {invoice_id} is {invoice.status}")
    now = clock.timestamp()
    with db.transaction() as conn:
        debited = conn.execute(
            "UPDATE users SET credit_cents = credit_cents - ?"
            " WHERE id = ? AND credit_cents >= ?",
            (invoice.amount_cents, user_id, invoice.amount_cents),
        ).rowcount
        if debited == 0:
            raise InsufficientCredit(f"user {user_id} cannot cover invoice {invoice_id}")
        conn.execute(
            "UPDATE invoices SET status = 'paid', paid_at = ? WHERE id = ?",
            (now, invoice_id),
        )
        conn.execute(
            "INSERT INTO credit_entries (user_id, amount_cents, reason, created_at)"
            " VALUES (?, ?, ?, ?)",
            (user_id, -invoice.amount_cents, f"Invoice {invoice_id}", now),
        )
