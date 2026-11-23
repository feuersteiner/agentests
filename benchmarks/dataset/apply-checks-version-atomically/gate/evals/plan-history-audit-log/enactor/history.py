"""An audit log of which plan each endpoint moved to, and when."""

from datetime import datetime, timedelta, timezone

from enactor import store

RETENTION = timedelta(days=30)

SCHEMA = """
CREATE TABLE IF NOT EXISTS plan_history (
    id INTEGER PRIMARY KEY,
    endpoint TEXT NOT NULL,
    plan_gen INTEGER NOT NULL,
    recorded_at TEXT NOT NULL
);
"""


def ensure_table() -> None:
    store.connection().executescript(SCHEMA)


def record(endpoint: str, plan_gen: int) -> None:
    """Add a line to the audit log."""
    store.connection().execute(
        "INSERT INTO plan_history (endpoint, plan_gen, recorded_at) VALUES (?, ?, ?)",
        (endpoint, plan_gen, datetime.now(timezone.utc).isoformat()),
    )


def history(endpoint: str) -> list[tuple[int, str]]:
    rows = store.connection().execute(
        "SELECT plan_gen, recorded_at FROM plan_history WHERE endpoint = ? ORDER BY id",
        (endpoint,),
    ).fetchall()
    return [(row["plan_gen"], row["recorded_at"]) for row in rows]


def delete_old_entries(now: datetime | None = None) -> int:
    """Delete audit lines older than RETENTION. Returns how many."""
    cutoff = ((now or datetime.now(timezone.utc)) - RETENTION).isoformat()
    cursor = store.connection().execute("DELETE FROM plan_history WHERE recorded_at < ?", (cutoff,))
    return cursor.rowcount
