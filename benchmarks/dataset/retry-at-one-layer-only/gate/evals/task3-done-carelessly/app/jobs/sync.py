"""The nightly stock sync: copies every product's stock level into STOCK_LEVELS."""

from __future__ import annotations

import logging
import time

from app.clients import InventoryClient
from app.http import HTTPError, TransportError
from app.models import CATALOGUE, STOCK_LEVELS
from app.queue import job

log = logging.getLogger(__name__)

SYNC_ATTEMPTS = 3
SYNC_RETRY_DELAY_SECONDS = 5.0


def _sync_all(client: InventoryClient) -> None:
    for sku in CATALOGUE:
        STOCK_LEVELS[sku] = client.get_stock(sku)


@job("stock-sync")
def sync_stock(client: InventoryClient | None = None, sleep=time.sleep) -> int:
    """Refresh STOCK_LEVELS from the inventory service and return how many products it holds.

    The inventory service hiccups now and then, so the sync step is retried up to SYNC_ATTEMPTS
    times with a growing delay before the job gives up.
    """
    client = client or InventoryClient()
    for attempt in range(1, SYNC_ATTEMPTS + 1):
        try:
            _sync_all(client)
            break
        except (HTTPError, TransportError):
            if attempt == SYNC_ATTEMPTS:
                raise
            log.warning("stock sync failed (attempt %d of %d), retrying", attempt, SYNC_ATTEMPTS)
            sleep(SYNC_RETRY_DELAY_SECONDS * attempt)
    return len(STOCK_LEVELS)
