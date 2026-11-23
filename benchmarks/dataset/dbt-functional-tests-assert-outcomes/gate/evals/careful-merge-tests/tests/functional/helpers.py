import sqlite3


def seed_orders(db: sqlite3.Connection, rows: list[tuple]) -> None:
    """Add rows of (id, status, amount, updated_at) to raw_orders."""
    db.executemany("INSERT INTO raw_orders (id, status, amount, updated_at) VALUES (?, ?, ?, ?)", rows)
    db.commit()


def orders(db: sqlite3.Connection) -> list[tuple]:
    """The rows of the orders reporting table, in a stable order."""
    return db.execute(
        "SELECT id, status, amount, updated_at FROM orders ORDER BY id, updated_at"
    ).fetchall()
