"""Applying the newest plan to the endpoints."""

import logging
import time
from datetime import datetime, timezone

from enactor import dns, store

log = logging.getLogger("enactor.apply")

RETRY_ROUNDS = 3
RETRY_DELAY_SECONDS = 5.0


def apply_latest_plan() -> int | None:
    """Apply the newest plan to the endpoints. Returns its generation, or None when there is no plan.

    An endpoint whose push fails is retried on its own instead of aborting the whole plan.
    """
    plan = store.newest_plan()
    if plan is None:
        return None
    pending = [
        endpoint.name
        for endpoint in store.list_endpoints()
        if endpoint.plan_gen < plan.gen and endpoint.name in plan.records
    ]
    for round_number in range(1, RETRY_ROUNDS + 1):
        failed = []
        for name in pending:
            try:
                dns.push(name, plan.records[name])
            except dns.PushError as error:
                log.warning("round %s: %s", round_number, error)
                failed.append(name)
                continue
            store.connection().execute(
                "UPDATE endpoints SET plan_gen = ?, applied_at = ? WHERE name = ?",
                (plan.gen, datetime.now(timezone.utc).isoformat(), name),
            )
        pending = failed
        if not pending:
            break
        time.sleep(RETRY_DELAY_SECONDS * round_number)
    return plan.gen
