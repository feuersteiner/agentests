"""The nightly stock sync: copies every product's stock level into STOCK_CACHE."""

from __future__ import annotations

import logging
import time

from app.clients import InventoryClient
from app.http import HTTPError, TransportError
from app.models import CATALOGUE, STOCK_CACHE
from app.queue import job

log = logging.getLogger(__name__)


@job("stock-sync")
def sync_stock(client: InventoryClient | None = None) -> int:
    """Refresh STOCK_CACHE from the inventory service and return how many products it holds.

    Products whose lookup fails are tried once more at the end, after a pause.
    """
    client = client or InventoryClient()
    failed = []
    for sku in CATALOGUE:
        try:
            STOCK_CACHE[sku] = client.get_stock(sku)
        except (HTTPError, TransportError):
            failed.append(sku)
    if failed:
        log.warning("trying %d product(s) again: %s", len(failed), ", ".join(failed))
        time.sleep(30)
        for sku in failed:
            STOCK_CACHE[sku] = client.get_stock(sku)
    return len(STOCK_CACHE)
