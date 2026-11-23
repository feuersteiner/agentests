"""The nightly stock sync: copies every product's stock level into STOCK_CACHE."""

from __future__ import annotations

import logging
import time

from app.clients import InventoryClient
from app.http import HTTPError, TransportError
from app.models import CATALOGUE, STOCK_CACHE
from app.queue import job

log = logging.getLogger(__name__)

ATTEMPTS_PER_SKU = 3


@job("stock-sync")
def sync_stock(client: InventoryClient | None = None) -> int:
    """Refresh STOCK_CACHE from the inventory service and return how many products it holds."""
    client = client or InventoryClient()
    for sku in CATALOGUE:
        for attempt in range(1, ATTEMPTS_PER_SKU + 1):
            try:
                STOCK_CACHE[sku] = client.get_stock(sku)
                break
            except (HTTPError, TransportError):
                if attempt == ATTEMPTS_PER_SKU:
                    raise
                log.warning("stock lookup for %s failed, trying again", sku)
                time.sleep(2 * attempt)
    return len(STOCK_CACHE)
