"""Carts: opening them, filling them and showing them."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime


class CartError(Exception):
    """The request cannot be carried out; the message says why."""


class CartNotFound(CartError):
    pass


@dataclass
class Cart:
    id: int
    customer_id: int
    status: str
    updated_at: str
    items: list[dict]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "status": self.status,
            "updated_at": self.updated_at,
            "items": self.items,
        }


def open_cart(db: sqlite3.Connection, customer_id: int, now: datetime) -> Cart:
    customer = db.execute("SELECT id FROM customers WHERE id = ?", (customer_id,)).fetchone()
    if customer is None:
        raise CartError(f"unknown customer {customer_id}")
    cursor = db.execute(
        "INSERT INTO carts (customer_id, updated_at) VALUES (?, ?)", (customer_id, now.isoformat())
    )
    db.commit()
    return get_cart(db, cursor.lastrowid)


def get_cart(db: sqlite3.Connection, cart_id: int) -> Cart:
    row = db.execute("SELECT * FROM carts WHERE id = ?", (cart_id,)).fetchone()
    if row is None:
        raise CartNotFound(f"no cart {cart_id}")
    items = db.execute(
        "SELECT product, quantity FROM cart_items WHERE cart_id = ? ORDER BY id", (cart_id,)
    ).fetchall()
    return Cart(
        id=row["id"],
        customer_id=row["customer_id"],
        status=row["status"],
        updated_at=row["updated_at"],
        items=[dict(item) for item in items],
    )


def add_item(db: sqlite3.Connection, cart_id: int, product: str, quantity: int, now: datetime) -> Cart:
    """Add a product to an open cart; adding a product it already holds raises its quantity."""
    cart = get_cart(db, cart_id)
    if cart.status != "open":
        raise CartError(f"cart {cart_id} is {cart.status}")
    if quantity < 1:
        raise CartError("quantity must be at least 1")
    held = db.execute(
        "SELECT id FROM cart_items WHERE cart_id = ? AND product = ?", (cart_id, product)
    ).fetchone()
    if held is None:
        db.execute(
            "INSERT INTO cart_items (cart_id, product, quantity) VALUES (?, ?, ?)", (cart_id, product, quantity)
        )
    else:
        db.execute("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?", (quantity, held["id"]))
    db.execute("UPDATE carts SET updated_at = ? WHERE id = ?", (now.isoformat(), cart_id))
    db.commit()
    return get_cart(db, cart_id)
