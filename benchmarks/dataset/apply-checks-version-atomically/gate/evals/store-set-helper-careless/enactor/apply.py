"""Applying the newest plan to the endpoints."""

from datetime import datetime, timezone

from enactor import dns, store


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def apply_latest_plan() -> int | None:
    """Apply the newest plan to the endpoints. Returns its generation, or None when there is no plan."""
    plan = store.newest_plan()
    if plan is None:
        return None
    for endpoint in store.list_endpoints():
        if endpoint.plan_gen < plan.gen and endpoint.name in plan.records:
            dns.push(endpoint.name, plan.records[endpoint.name])
            store.set_plan_gen(endpoint.name, plan.gen, _now())
    return plan.gen
