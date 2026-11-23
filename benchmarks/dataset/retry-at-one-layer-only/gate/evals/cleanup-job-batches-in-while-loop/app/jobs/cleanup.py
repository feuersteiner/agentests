"""The weekly order clean-up: drops orders older than the keep limit, a batch at a time."""

from __future__ import annotations

import logging

from app.models import ORDERS
from app.queue import job

log = logging.getLogger(__name__)

KEEP_ORDERS = 10_000
BATCH_SIZE = 500


@job("order-cleanup")
def clean_up_orders() -> int:
    """Remove the oldest orders beyond KEEP_ORDERS and return how many were removed."""
    removed = 0
    while len(ORDERS) > KEEP_ORDERS:
        batch = min(BATCH_SIZE, len(ORDERS) - KEEP_ORDERS)
        del ORDERS[:batch]
        removed += batch
        log.info("removed %d old orders", batch)
    return removed
