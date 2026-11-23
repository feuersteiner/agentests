"""The SQLite connection, the schema and transactions."""

import sqlite3
from contextlib import contextmanager

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    credit_cents INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS credit_entries (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount_cents INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount_cents INTEGER NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    paid_at TEXT
);
CREATE TABLE IF NOT EXISTS gift_cards (
    code TEXT PRIMARY KEY,
    value_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    used_by INTEGER REFERENCES users(id),
    used_at TEXT
);
CREATE TABLE IF NOT EXISTS products (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS coupons (
    code TEXT PRIMARY KEY,
    percent_off INTEGER NOT NULL,
    usage_limit INTEGER,
    times_used INTEGER NOT NULL DEFAULT 0,
    expires_on TEXT
);
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subtotal_cents INTEGER NOT NULL,
    discount_cents INTEGER NOT NULL,
    coupon_code TEXT REFERENCES coupons(code),
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_lines (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    sku TEXT NOT NULL REFERENCES products(sku),
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL
);
"""

_connection: sqlite3.Connection | None = None
_depth = 0


def connect(path: str = ":memory:") -> sqlite3.Connection:
    """Open the database at `path`, create the tables and make it the service's connection."""
    global _connection, _depth
    if _connection is not None:
        _connection.close()
    _connection = sqlite3.connect(path, isolation_level=None, timeout=5.0)
    _connection.row_factory = sqlite3.Row
    _connection.execute("PRAGMA foreign_keys = ON")
    _connection.executescript(SCHEMA)
    _depth = 0
    return _connection


def connection() -> sqlite3.Connection:
    """The service's connection. Outside a transaction every statement commits on its own."""
    if _connection is None:
        raise RuntimeError("call app.db.connect() first")
    return _connection


@contextmanager
def transaction(immediate: bool = False):
    """Run the block in one transaction: commit when it ends, roll back when it raises.

    A block inside another joins the outer transaction. SQLite takes the database's write lock
    at a transaction's first write; with `immediate=True` the outermost block takes it at BEGIN
    instead, and no other connection can write until the block ends.
    """
    global _depth
    conn = connection()
    outermost = _depth == 0
    if outermost:
        conn.execute("BEGIN IMMEDIATE" if immediate else "BEGIN")
    _depth += 1
    try:
        yield conn
    except BaseException:
        _depth -= 1
        if outermost:
            conn.execute("ROLLBACK")
        raise
    _depth -= 1
    if outermost:
        conn.execute("COMMIT")
