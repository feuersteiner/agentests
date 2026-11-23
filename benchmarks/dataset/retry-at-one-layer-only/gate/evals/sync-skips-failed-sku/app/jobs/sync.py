"""The nightly stock sync: copies every product's stock level into STOCK_CACHE."""

from __future__ import annotations

import logging

from app.clients import InventoryClient
from app.http import HTTPError, TransportError
from app.models import CATALOGUE, STOCK_CACHE
from app.queue import job

log = logging.getLogger(__name__)


@job("stock-sync")
def sync_stock(client: InventoryClient | None = None) -> int:
    """Refresh STOCK_CACHE from the inventory service and return how many products it holds.

    A product whose lookup still fails after the session's retries keeps its last known level,
    so one hiccup no longer fails the whole sync.
    """
    client = client or InventoryClient()
    failed = []
    for sku in CATALOGUE:
        try:
            STOCK_CACHE[sku] = client.get_stock(sku)
        except (HTTPError, TransportError):
            log.warning("stock lookup for %s failed; keeping its last known level", sku, exc_info=True)
            failed.append(sku)
    if failed:
        log.error("stock sync finished without %d product(s): %s", len(failed), ", ".join(failed))
    return len(STOCK_CACHE)
