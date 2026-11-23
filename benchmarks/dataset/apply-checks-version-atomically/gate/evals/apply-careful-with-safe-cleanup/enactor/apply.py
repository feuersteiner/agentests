"""Applying the newest plan to the endpoints, and deleting old plans afterwards."""

import logging
from datetime import datetime, timezone

from enactor import dns, store

log = logging.getLogger("enactor.apply")

KEEP_GENERATIONS = 10

def apply_latest_plan() -> int | None:
    """Apply the newest plan to the endpoints, then clean up. Returns its generation, or None."""
    plan = store.newest_plan()
    if plan is None:
        return None
    conn = store.connection()
    for endpoint in store.list_endpoints():
        addresses = plan.records.get(endpoint.name)
        if addresses is None:
            continue
        cursor = conn.execute(
            "update endpoints set plan_gen = ?, applied_at = ? where name = ? and plan_gen < ?",
            (plan.gen, datetime.now(timezone.utc).isoformat(), endpoint.name, plan.gen),
        )
        if cursor.rowcount == 1:
            dns.push(endpoint.name, addresses)
    deleted = delete_old_plans(plan.gen)
    log.info("applied plan %s, deleted %s old plan(s)", plan.gen, deleted)
    return plan.gen


def delete_old_plans(applied_gen: int) -> int:
    """Delete plans more than KEEP_GENERATIONS generations older than `applied_gen`."""
    cutoff = applied_gen - KEEP_GENERATIONS
    return store.connection().execute(
        "delete from plans where gen < ? and gen not in (select plan_gen from endpoints)",
        (cutoff,),
    ).rowcount
