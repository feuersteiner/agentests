"""A one-line status of the enactor for the on-call dashboard."""

from enactor import store


def lagging_endpoints() -> list[str]:
    """Endpoints that do not serve the newest plan yet."""
    newest = store.newest_plan()
    if newest is None:
        return []
    rows = store.connection().execute(
        "SELECT name FROM endpoints WHERE plan_gen < ? ORDER BY name", (newest.gen,)
    ).fetchall()
    return [row["name"] for row in rows]


def summary() -> str:
    count = store.connection().execute("SELECT COUNT(*) FROM plans").fetchone()[0]
    newest = store.newest_plan()
    lagging = lagging_endpoints()
    head = f"{count} plans kept, newest {newest.gen}" if newest else "no plans yet"
    return f"{head}; lagging: {', '.join(lagging) or 'none'}"
