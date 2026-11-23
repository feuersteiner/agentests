"""The service's rows as dataclasses, and the functions that look them up."""

from dataclasses import dataclass

from app import db


@dataclass(frozen=True)
class User:
    id: int
    email: str
    name: str
    credit_cents: int


@dataclass(frozen=True)
class Invoice:
    id: int
    user_id: int
    amount_cents: int
    description: str
    status: str
    paid_at: str | None


@dataclass(frozen=True)
class GiftCard:
    code: str
    value_cents: int
    created_at: str
    used_by: int | None
    used_at: str | None


@dataclass(frozen=True)
class Product:
    sku: str
    name: str
    price_cents: int


@dataclass(frozen=True)
class Coupon:
    code: str
    percent_off: int
    usage_limit: int | None
    times_used: int
    expires_on: str | None


def get_user(user_id: int) -> User | None:
    row = db.connection().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return User(**row) if row else None


def get_invoice(invoice_id: int) -> Invoice | None:
    row = db.connection().execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    return Invoice(**row) if row else None


def list_invoices(user_id: int) -> list[Invoice]:
    rows = db.connection().execute(
        "SELECT * FROM invoices WHERE user_id = ? ORDER BY id", (user_id,)
    ).fetchall()
    return [Invoice(**row) for row in rows]


def get_gift_card(code: str) -> GiftCard | None:
    row = db.connection().execute("SELECT * FROM gift_cards WHERE code = ?", (code,)).fetchone()
    return GiftCard(**row) if row else None


def get_product(sku: str) -> Product | None:
    row = db.connection().execute("SELECT * FROM products WHERE sku = ?", (sku,)).fetchone()
    return Product(**row) if row else None


def get_coupon(code: str) -> Coupon | None:
    row = db.connection().execute("SELECT * FROM coupons WHERE code = ?", (code,)).fetchone()
    return Coupon(**row) if row else None
