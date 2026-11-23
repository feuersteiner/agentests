"""The plan database: its schema, transactions and the queries the enactor reads with."""

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass

SCHEMA = """
CREATE TABLE IF NOT EXISTS plans (
    gen INTEGER PRIMARY KEY,
    created_at TEXT NOT NULL,
    records TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS endpoints (
    name TEXT PRIMARY KEY,
    plan_gen INTEGER NOT NULL DEFAULT 0,
    applied_at TEXT
);
"""


@dataclass(frozen=True)
class Plan:
    gen: int
    created_at: str
    records: dict[str, list[str]]


@dataclass(frozen=True)
class Endpoint:
    name: str
    plan_gen: int
    applied_at: str | None


_connection: sqlite3.Connection | None = None
_depth = 0


def connect(path: str = ":memory:") -> sqlite3.Connection:
    """Open the database at `path`, create the tables and make it the enactor's connection."""
    global _connection, _depth
    if _connection is not None:
        _connection.close()
    _connection = sqlite3.connect(path, isolation_level=None, timeout=5.0)
    _connection.row_factory = sqlite3.Row
    _connection.executescript(SCHEMA)
    _depth = 0
    return _connection


def connection() -> sqlite3.Connection:
    """The enactor's connection. Outside a transaction every statement commits on its own."""
    if _connection is None:
        raise RuntimeError("call enactor.store.connect() first")
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


def _plan(row: sqlite3.Row) -> Plan:
    return Plan(gen=row["gen"], created_at=row["created_at"], records=json.loads(row["records"]))


def newest_plan() -> Plan | None:
    """The plan with the highest generation, or None when the planner has written none yet."""
    row = connection().execute("SELECT * FROM plans ORDER BY gen DESC LIMIT 1").fetchone()
    return _plan(row) if row else None


def get_plan(gen: int) -> Plan | None:
    row = connection().execute("SELECT * FROM plans WHERE gen = ?", (gen,)).fetchone()
    return _plan(row) if row else None


def list_endpoints() -> list[Endpoint]:
    """Every endpoint, by name."""
    rows = connection().execute("SELECT * FROM endpoints ORDER BY name").fetchall()
    return [Endpoint(**dict(row)) for row in rows]


def get_endpoint(name: str) -> Endpoint | None:
    row = connection().execute("SELECT * FROM endpoints WHERE name = ?", (name,)).fetchone()
    return Endpoint(**dict(row)) if row else None


def claim_endpoint(name: str, gen: int, applied_at: str) -> bool:
    """Move `name` to plan `gen` unless it already has that plan or a newer one. True when it moved."""
    cursor = connection().execute(
        "UPDATE endpoints SET plan_gen = ?, applied_at = ? WHERE name = ? AND plan_gen < ?",
        (gen, applied_at, name, gen),
    )
    return cursor.rowcount == 1
