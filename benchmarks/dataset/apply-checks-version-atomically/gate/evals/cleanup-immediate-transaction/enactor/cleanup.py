"""Deleting old plans after a plan has been applied."""

from enactor import store

KEEP_GENERATIONS = 10


def delete_old_plans(applied_gen: int) -> int:
    """Delete plans more than KEEP_GENERATIONS generations older than `applied_gen`. Returns how many."""
    with store.transaction(immediate=True) as conn:
        active = [row["plan_gen"] for row in conn.execute("SELECT DISTINCT plan_gen FROM endpoints")]
        placeholders = ", ".join("?" for _ in active)
        cursor = conn.execute(
            f"DELETE FROM plans WHERE gen < ? AND gen NOT IN ({placeholders})",
            (applied_gen - KEEP_GENERATIONS, *active),
        )
        return cursor.rowcount
