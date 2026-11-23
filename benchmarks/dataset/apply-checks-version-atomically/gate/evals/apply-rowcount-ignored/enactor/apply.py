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
    conn = store.connection()
    for endpoint in store.list_endpoints():
        addresses = plan.records.get(endpoint.name)
        if not addresses:
            continue
        conn.execute(
            "UPDATE endpoints SET plan_gen = ?, applied_at = ? WHERE name = ? AND plan_gen < ?",
            (plan.gen, _now(), endpoint.name, plan.gen),
        )
        dns.push(endpoint.name, addresses)
    return plan.gen
