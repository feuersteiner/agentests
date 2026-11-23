"""The SQLite connection, the schema and transactions."""

import sqlite3
from contextlib import contextmanager

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    line1 TEXT NOT NULL,
    postcode TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    stock INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    status TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    invoice_number TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL,
    provider_reference TEXT
);
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    number TEXT NOT NULL UNIQUE
);
"""

_connection: sqlite3.Connection | None = None


def connect(path: str = ":memory:") -> sqlite3.Connection:
    """Open the database at `path`, create the tables and make it the service's connection."""
    global _connection
    if _connection is not None:
        _connection.close()
    _connection = sqlite3.connect(path, isolation_level=None)
    _connection.row_factory = sqlite3.Row
    _connection.executescript(SCHEMA)
    transaction.reset()
    return _connection


def connection() -> sqlite3.Connection:
    """The service's connection. Outside a transaction every statement commits on its own."""
    if _connection is None:
        raise RuntimeError("call store.db.connect() first")
    return _connection


class Transaction:
    """Transactions on the service's connection, used as `transaction.atomic()`."""

    def __init__(self) -> None:
        self._depth = 0
        self._callbacks: list = []

    def reset(self) -> None:
        self._depth = 0
        self._callbacks = []

    @contextmanager
    def atomic(self):
        """Run the block in one transaction: commit when it ends, roll back when it raises.

        Works as `with transaction.atomic():` and as the decorator `@transaction.atomic()`.
        A block inside another joins the outer transaction.
        """
        outermost = self._depth == 0
        if outermost:
            connection().execute("BEGIN")
        self._depth += 1
        try:
            yield
        except BaseException:
            self._depth -= 1
            if outermost:
                connection().execute("ROLLBACK")
                self._callbacks = []
            raise
        self._depth -= 1
        if outermost:
            connection().execute("COMMIT")
            callbacks, self._callbacks = self._callbacks, []
            for callback in callbacks:
                callback()

    def on_commit(self, callback) -> None:
        """Call `callback` once the open transaction has committed; it is dropped on a rollback.

        With no transaction open, `callback` is called at once.
        """
        if self._depth == 0:
            callback()
        else:
            self._callbacks.append(callback)


transaction = Transaction()
