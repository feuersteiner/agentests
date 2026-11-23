"""Applying the newest plan to the endpoints."""

import logging
from datetime import datetime, timezone

from enactor import dns, store

log = logging.getLogger("enactor.apply")

RETRY_ROUNDS = 3


def apply_latest_plan() -> int | None:
    """Apply the newest plan to the endpoints. Returns its generation, or None when there is no plan.

    An endpoint whose push fails is pushed again after the others, up to RETRY_ROUNDS times,
    instead of stopping the whole plan.
    """
    plan = store.newest_plan()
    if plan is None:
        return None
    pending = []
    for endpoint in store.list_endpoints():
        addresses = plan.records.get(endpoint.name)
        if addresses is None:
            continue
        cursor = store.connection().execute(
            "UPDATE endpoints SET plan_gen = ?, applied_at = ? WHERE name = ? AND plan_gen < ?",
            (plan.gen, datetime.now(timezone.utc).isoformat(), endpoint.name, plan.gen),
        )
        if cursor.rowcount == 1:
            pending.append((endpoint.name, addresses))
    for _ in range(RETRY_ROUNDS):
        failed = []
        for name, addresses in pending:
            try:
                dns.push(name, addresses)
            except dns.PushError as error:
                log.warning("push of plan %s failed, will retry: %s", plan.gen, error)
                failed.append((name, addresses))
        pending = failed
        if not pending:
            break
    for name, _ in pending:
        log.error("gave up pushing plan %s to %s", plan.gen, name)
    return plan.gen
