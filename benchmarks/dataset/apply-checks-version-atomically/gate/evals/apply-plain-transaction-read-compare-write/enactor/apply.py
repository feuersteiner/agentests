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
    for name, addresses in plan.records.items():
        with store.transaction() as conn:
            row = conn.execute("SELECT plan_gen FROM endpoints WHERE name = ?", (name,)).fetchone()
            if row is None or row["plan_gen"] >= plan.gen:
                continue
            dns.push(name, addresses)
            conn.execute(
                "UPDATE endpoints SET plan_gen = ?, applied_at = ? WHERE name = ?",
                (plan.gen, _now(), name),
            )
    return plan.gen
