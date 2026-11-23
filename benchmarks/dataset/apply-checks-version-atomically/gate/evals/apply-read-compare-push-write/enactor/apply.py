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
        if endpoint.plan_gen >= plan.gen:
            continue  # already on this plan or a newer one
        addresses = plan.records.get(endpoint.name)
        if addresses is None:
            continue
        dns.push(endpoint.name, addresses)
        store.connection().execute(
            "UPDATE endpoints SET plan_gen = ?, applied_at = ? WHERE name = ?",
            (plan.gen, _now(), endpoint.name),
        )
    return plan.gen
