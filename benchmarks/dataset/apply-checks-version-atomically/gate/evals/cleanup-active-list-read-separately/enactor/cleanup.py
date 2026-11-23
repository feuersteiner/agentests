"""Deleting old plans after a plan has been applied."""

from enactor import store

KEEP_GENERATIONS = 10


def delete_old_plans(applied_gen: int) -> int:
    """Delete plans more than KEEP_GENERATIONS generations older than `applied_gen`, but not the
    plans the endpoints were serving when the cleanup started. Returns how many."""
    active = sorted({endpoint.plan_gen for endpoint in store.list_endpoints()})
    placeholders = ", ".join("?" for _ in active)
    cursor = store.connection().execute(
        f"DELETE FROM plans WHERE gen < ? AND gen NOT IN ({placeholders})",
        (applied_gen - KEEP_GENERATIONS, *active),
    )
    return cursor.rowcount
