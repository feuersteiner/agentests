"""Applying the newest plan to the endpoints."""

import logging
from datetime import datetime, timezone

from enactor import dns, store

log = logging.getLogger("enactor.apply")


def apply_latest_plan() -> int | None:
    """Apply the newest plan to the endpoints. Returns its generation, or None when there is no plan."""
    plan = store.newest_plan()
    if plan is None:
        return None
    conn = store.connection()
    for endpoint in store.list_endpoints():
        if endpoint.plan_gen >= plan.gen or endpoint.name not in plan.records:
            continue
        applied_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        cursor = conn.execute(
            "UPDATE endpoints SET plan_gen = ?, applied_at = ? WHERE name = ? AND plan_gen = ?",
            (plan.gen, applied_at, endpoint.name, endpoint.plan_gen),
        )
        if cursor.rowcount == 0:
            log.info("%s changed since it was read, skipping it", endpoint.name)
            continue
        dns.push(endpoint.name, plan.records[endpoint.name])
    return plan.gen
