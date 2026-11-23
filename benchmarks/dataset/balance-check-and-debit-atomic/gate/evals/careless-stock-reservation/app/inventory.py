"""Paper stock for print runs."""

from app import db
from app.errors import BillingError, NotFound


class OutOfStock(BillingError):
    """Not enough sheets of the paper are left."""


def sheets_left(sku: str) -> int:
    row = db.connection().execute("SELECT stock FROM paper WHERE sku = ?", (sku,)).fetchone()
    if row is None:
        raise NotFound(f"paper {sku}")
    return row["stock"]


def reserve_sheets(sku: str, sheets: int) -> None:
    """Set aside `sheets` sheets of the paper for a print run."""
    if sheets <= 0:
        raise ValueError("sheets must be positive")
    left = sheets_left(sku)
    if left < sheets:
        raise OutOfStock(f"{sku}: {left} left, {sheets} wanted")
    db.connection().execute("UPDATE paper SET stock = ? WHERE sku = ?", (left - sheets, sku))
