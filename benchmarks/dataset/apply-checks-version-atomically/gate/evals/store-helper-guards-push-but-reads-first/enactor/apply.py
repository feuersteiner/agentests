"""Applying the newest plan to the endpoints."""

from datetime import datetime, timezone

from enactor import dns, store


def apply_latest_plan() -> int | None:
    """Apply the newest plan to the endpoints. Returns its generation, or None when there is no plan."""
    plan = store.newest_plan()
    if plan is None:
        return None
    for name, addresses in plan.records.items():
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        if store.record_applied(name, plan.gen, now):
            dns.push(name, addresses)
    return plan.gen
