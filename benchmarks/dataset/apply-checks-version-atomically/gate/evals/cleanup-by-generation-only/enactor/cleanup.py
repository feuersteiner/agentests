"""Deleting old plans after a plan has been applied."""

from enactor import store

KEEP_GENERATIONS = 10


def delete_old_plans(applied_gen: int) -> int:
    """Delete plans more than KEEP_GENERATIONS generations older than `applied_gen`. Returns how many."""
    cursor = store.connection().execute(
        "DELETE FROM plans WHERE gen < ?",
        (applied_gen - KEEP_GENERATIONS,),
    )
    return cursor.rowcount
