"""Applying the newest plan to the endpoints."""

import threading
from datetime import datetime, timezone

from enactor import dns, store

# Enactors running side by side take turns, so they never apply at the same moment.
_apply_lock = threading.Lock()


def apply_latest_plan() -> int | None:
    """Apply the newest plan to the endpoints. Returns its generation, or None when there is no plan."""
    with _apply_lock:
        plan = store.newest_plan()
        if plan is None:
            return None
        for endpoint in store.list_endpoints():
            if endpoint.plan_gen >= plan.gen or endpoint.name not in plan.records:
                continue
            dns.push(endpoint.name, plan.records[endpoint.name])
            store.connection().execute(
                "UPDATE endpoints SET plan_gen = ?, applied_at = ? WHERE name = ?",
                (plan.gen, datetime.now(timezone.utc).isoformat(timespec="seconds"), endpoint.name),
            )
        return plan.gen
