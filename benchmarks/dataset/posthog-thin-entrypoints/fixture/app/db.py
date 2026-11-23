"""The SQLite connection and the schema."""

import os
import sqlite3

DEFAULT_PATH = "larkspur.db"

SCHEMA = """
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    credit_limit_cents INTEGER NOT NULL DEFAULT 50000,
    trusted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    paid_at TEXT,
    shipped_at TEXT
);

CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL
);

CREATE TABLE carts (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL DEFAULT 'open',
    updated_at TEXT NOT NULL
);

CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES carts(id),
    product TEXT NOT NULL,
    quantity INTEGER NOT NULL
);
"""


def connect(path: str | None = None) -> sqlite3.Connection:
    """Open the database at `path`, or at LARKSPUR_DB, or at larkspur.db."""
    connection = sqlite3.connect(path or os.environ.get("LARKSPUR_DB", DEFAULT_PATH))
    connection.row_factory = sqlite3.Row
    return connection


def init_schema(connection: sqlite3.Connection) -> None:
    """Create the tables."""
    connection.executescript(SCHEMA)
    connection.commit()
