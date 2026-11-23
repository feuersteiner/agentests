"""Pruning the plans table."""

import logging

from enactor import store

log = logging.getLogger("enactor.cleanup")


def prune_plans(applied_gen: int, keep: int = 10) -> int:
    cutoff = applied_gen - keep
    deleted = store.connection().execute(
        """
        DELETE FROM plans
        WHERE gen < :cutoff
          AND NOT EXISTS (SELECT 1 FROM endpoints e WHERE e.plan_gen = plans.gen)
        """,
        {"cutoff": cutoff},
    ).rowcount
    log.info("pruned %d plan(s) older than generation %d", deleted, cutoff)
    return deleted
