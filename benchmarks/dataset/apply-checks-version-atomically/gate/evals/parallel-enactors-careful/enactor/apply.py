"""Applying the newest plan to the endpoints.

Several enactors run at once against the same database. Each endpoint moves to a plan through
one UPDATE that also checks its current generation, so two enactors never both apply to it and
an older plan never replaces a newer one.
"""

import logging
import os
from datetime import datetime, timezone

from enactor import dns, store

log = logging.getLogger("enactor.apply")
NAME = os.environ.get("ENACTOR_NAME", "enactor")


def apply_latest_plan() -> int | None:
    """Apply the newest plan to the endpoints. Returns its generation, or None when there is no plan."""
    plan = store.newest_plan()
    if plan is None:
        return None
    for name, addresses in sorted(plan.records.items()):
        cursor = store.connection().execute(
            "UPDATE endpoints SET plan_gen = :gen, applied_at = :now"
            " WHERE name = :name AND plan_gen < :gen",
            {"gen": plan.gen, "now": datetime.now(timezone.utc).isoformat(), "name": name},
        )
        if cursor.rowcount != 1:
            log.debug("%s: %s already has plan %s or newer", NAME, name, plan.gen)
            continue
        dns.push(name, addresses)
        log.info("%s: pushed plan %s to %s", NAME, plan.gen, name)
    return plan.gen
