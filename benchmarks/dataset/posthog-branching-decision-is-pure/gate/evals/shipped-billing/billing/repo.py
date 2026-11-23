"""The SQLite schema and every query. Times are stored as ISO 8601 text in UTC."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL,
    signed_up_at TEXT NOT NULL,
    trial_ends_at TEXT NOT NULL,
    trial_extended INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    amount_cents INTEGER NOT NULL,
    due_at TEXT NOT NULL,
    paid_at TEXT,
    failed_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    plan TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    subject TEXT NOT NULL,
    queue TEXT
);
"""


@dataclass(frozen=True)
class Customer:
    id: int
    email: str
    plan: str
    signed_up_at: datetime
    trial_ends_at: datetime
    trial_extended: bool


@dataclass(frozen=True)
class Invoice:
    id: int
    customer_id: int
    amount_cents: int
    due_at: datetime
    paid_at: datetime | None
    failed_attempts: int


@dataclass(frozen=True)
class Subscription:
    id: int
    customer_id: int
    plan: str
    status: str


@dataclass(frozen=True)
class Ticket:
    id: int
    customer_id: int
    subject: str
    queue: str | None


def connect(path: str = ":memory:") -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def _to_time(text: str | None) -> datetime | None:
    return datetime.fromisoformat(text) if text else None


def _to_invoice(row: sqlite3.Row) -> Invoice:
    return Invoice(
        id=row["id"],
        customer_id=row["customer_id"],
        amount_cents=row["amount_cents"],
        due_at=_to_time(row["due_at"]),
        paid_at=_to_time(row["paid_at"]),
        failed_attempts=row["failed_attempts"],
    )


def add_customer(
    conn: sqlite3.Connection, email: str, plan: str, signed_up_at: datetime, trial_ends_at: datetime
) -> int:
    cursor = conn.execute(
        "INSERT INTO customers (email, plan, signed_up_at, trial_ends_at) VALUES (?, ?, ?, ?)",
        (email, plan, signed_up_at.isoformat(), trial_ends_at.isoformat()),
    )
    conn.commit()
    return cursor.lastrowid


def get_customer(conn: sqlite3.Connection, customer_id: int) -> Customer:
    row = conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()
    return Customer(
        id=row["id"],
        email=row["email"],
        plan=row["plan"],
        signed_up_at=_to_time(row["signed_up_at"]),
        trial_ends_at=_to_time(row["trial_ends_at"]),
        trial_extended=bool(row["trial_extended"]),
    )


def set_plan(conn: sqlite3.Connection, customer_id: int, plan: str) -> None:
    conn.execute("UPDATE customers SET plan = ? WHERE id = ?", (plan, customer_id))
    conn.commit()


def set_trial_end(conn: sqlite3.Connection, customer_id: int, trial_ends_at: datetime) -> None:
    conn.execute(
        "UPDATE customers SET trial_ends_at = ?, trial_extended = 1 WHERE id = ?",
        (trial_ends_at.isoformat(), customer_id),
    )
    conn.commit()


def add_project(conn: sqlite3.Connection, customer_id: int, name: str) -> int:
    cursor = conn.execute(
        "INSERT INTO projects (customer_id, name) VALUES (?, ?)", (customer_id, name)
    )
    conn.commit()
    return cursor.lastrowid


def count_projects(conn: sqlite3.Connection, customer_id: int) -> int:
    row = conn.execute(
        "SELECT COUNT(*) AS total FROM projects WHERE customer_id = ?", (customer_id,)
    ).fetchone()
    return row["total"]


def add_invoice(
    conn: sqlite3.Connection, customer_id: int, amount_cents: int, due_at: datetime
) -> int:
    cursor = conn.execute(
        "INSERT INTO invoices (customer_id, amount_cents, due_at) VALUES (?, ?, ?)",
        (customer_id, amount_cents, due_at.isoformat()),
    )
    conn.commit()
    return cursor.lastrowid


def get_invoice(conn: sqlite3.Connection, invoice_id: int) -> Invoice:
    row = conn.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    return _to_invoice(row)


def unpaid_invoices(conn: sqlite3.Connection, customer_id: int | None = None) -> list[Invoice]:
    rows = conn.execute(
        "SELECT * FROM invoices WHERE paid_at IS NULL AND (?1 IS NULL OR customer_id = ?1)"
        " ORDER BY due_at, id",
        (customer_id,),
    ).fetchall()
    return [_to_invoice(row) for row in rows]


def mark_invoice_paid(conn: sqlite3.Connection, invoice_id: int, paid_at: datetime) -> None:
    conn.execute("UPDATE invoices SET paid_at = ? WHERE id = ?", (paid_at.isoformat(), invoice_id))
    conn.commit()


def add_failed_attempt(conn: sqlite3.Connection, invoice_id: int) -> None:
    conn.execute(
        "UPDATE invoices SET failed_attempts = failed_attempts + 1 WHERE id = ?", (invoice_id,)
    )
    conn.commit()


def add_subscription(conn: sqlite3.Connection, customer_id: int, plan: str) -> int:
    cursor = conn.execute(
        "INSERT INTO subscriptions (customer_id, plan) VALUES (?, ?)", (customer_id, plan)
    )
    conn.commit()
    return cursor.lastrowid


def get_subscription(conn: sqlite3.Connection, subscription_id: int) -> Subscription:
    row = conn.execute("SELECT * FROM subscriptions WHERE id = ?", (subscription_id,)).fetchone()
    return Subscription(
        id=row["id"], customer_id=row["customer_id"], plan=row["plan"], status=row["status"]
    )


def set_subscription_status(conn: sqlite3.Connection, subscription_id: int, status: str) -> None:
    conn.execute("UPDATE subscriptions SET status = ? WHERE id = ?", (status, subscription_id))
    conn.commit()


def add_ticket(conn: sqlite3.Connection, customer_id: int, subject: str) -> int:
    cursor = conn.execute(
        "INSERT INTO tickets (customer_id, subject) VALUES (?, ?)", (customer_id, subject)
    )
    conn.commit()
    return cursor.lastrowid


def get_ticket(conn: sqlite3.Connection, ticket_id: int) -> Ticket:
    row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    return Ticket(
        id=row["id"], customer_id=row["customer_id"], subject=row["subject"], queue=row["queue"]
    )


def set_ticket_queue(conn: sqlite3.Connection, ticket_id: int, queue: str) -> None:
    conn.execute("UPDATE tickets SET queue = ? WHERE id = ?", (queue, ticket_id))
    conn.commit()
