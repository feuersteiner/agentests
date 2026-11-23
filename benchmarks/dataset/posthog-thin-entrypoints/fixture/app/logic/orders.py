"""Orders: creating, paying, shipping and listing them."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime

FLAT_SHIPPING_CENTS = 500
FREE_SHIPPING_FROM_CENTS = 5000


class OrderError(Exception):
    """The request cannot be carried out; the message says why."""


class OrderNotFound(OrderError):
    pass


@dataclass
class Order:
    id: int
    customer_id: int
    status: str
    total_cents: int
    shipping_cents: int
    created_at: str
    paid_at: str | None
    shipped_at: str | None
    items: list[dict]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "status": self.status,
            "total_cents": self.total_cents,
            "shipping_cents": self.shipping_cents,
            "paid_at": self.paid_at,
            "shipped_at": self.shipped_at,
            "items": self.items,
        }


def _to_order(db: sqlite3.Connection, row: sqlite3.Row) -> Order:
    items = db.execute(
        "SELECT product, quantity, unit_price_cents FROM order_items WHERE order_id = ? ORDER BY id",
        (row["id"],),
    ).fetchall()
    return Order(
        id=row["id"],
        customer_id=row["customer_id"],
        status=row["status"],
        total_cents=row["total_cents"],
        shipping_cents=row["shipping_cents"],
        created_at=row["created_at"],
        paid_at=row["paid_at"],
        shipped_at=row["shipped_at"],
        items=[dict(item) for item in items],
    )


def shipping_for(goods_cents: int) -> int:
    """Flat shipping, free from 50.00 of goods."""
    return 0 if goods_cents >= FREE_SHIPPING_FROM_CENTS else FLAT_SHIPPING_CENTS


def create_order(db: sqlite3.Connection, customer_id: int, items: list[dict], now: datetime) -> Order:
    """Create a pending order. Each item has `product`, `quantity` and `unit_price_cents`."""
    customer = db.execute("SELECT id FROM customers WHERE id = ?", (customer_id,)).fetchone()
    if customer is None:
        raise OrderError(f"unknown customer {customer_id}")
    if not items:
        raise OrderError("an order needs at least one item")
    for item in items:
        if item["quantity"] < 1 or item["unit_price_cents"] < 0:
            raise OrderError(f"invalid quantity or price for {item['product']}")
    goods_cents = sum(item["quantity"] * item["unit_price_cents"] for item in items)
    shipping_cents = shipping_for(goods_cents)
    cursor = db.execute(
        "INSERT INTO orders (customer_id, total_cents, shipping_cents, created_at) VALUES (?, ?, ?, ?)",
        (customer_id, goods_cents + shipping_cents, shipping_cents, now.isoformat()),
    )
    db.executemany(
        "INSERT INTO order_items (order_id, product, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
        [(cursor.lastrowid, item["product"], item["quantity"], item["unit_price_cents"]) for item in items],
    )
    db.commit()
    return fetch_order(db, cursor.lastrowid)


def fetch_order(db: sqlite3.Connection, order_id: int) -> Order:
    row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if row is None:
        raise OrderNotFound(f"no order {order_id}")
    return _to_order(db, row)


def list_orders(db: sqlite3.Connection, customer_id: int | None = None, status: str | None = None) -> list[Order]:
    """Orders, optionally of one customer or in one status."""
    query, values = "SELECT * FROM orders WHERE 1 = 1", []
    if customer_id is not None:
        query += " AND customer_id = ?"
        values.append(customer_id)
    if status is not None:
        query += " AND status = ?"
        values.append(status)
    rows = db.execute(query + " ORDER BY created_at, id", values).fetchall()
    return [_to_order(db, row) for row in rows]


def mark_paid(db: sqlite3.Connection, order_id: int, now: datetime) -> Order:
    order = fetch_order(db, order_id)
    if order.status != "pending":
        raise OrderError(f"order {order_id} is {order.status}, not pending")
    db.execute("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?", (now.isoformat(), order_id))
    db.commit()
    return fetch_order(db, order_id)


def mark_shipped(db: sqlite3.Connection, order_id: int, now: datetime) -> Order:
    order = fetch_order(db, order_id)
    if order.status != "paid":
        raise OrderError(f"order {order_id} is {order.status}, not paid")
    db.execute("UPDATE orders SET status = 'shipped', shipped_at = ? WHERE id = ?", (now.isoformat(), order_id))
    db.commit()
    return fetch_order(db, order_id)
