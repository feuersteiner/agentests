"""The nightly stock sync: copies every product's stock level into STOCK_CACHE."""

from __future__ import annotations

import time

from app.clients import InventoryClient
from app.http import HTTPError
from app.models import CATALOGUE, STOCK_CACHE
from app.queue import job


def stock_of(client: InventoryClient, sku: str) -> int:
    """The stock level, asked again while the inventory service answers 429 Too Many Requests."""
    for attempt in range(1, 4):
        try:
            return client.get_stock(sku)
        except HTTPError as exc:
            if exc.status != 429 or attempt == 3:
                raise
            time.sleep(attempt)
    raise AssertionError("unreachable")


@job("stock-sync")
def sync_stock(client: InventoryClient | None = None) -> int:
    """Refresh STOCK_CACHE from the inventory service and return how many products it holds."""
    client = client or InventoryClient()
    for sku in CATALOGUE:
        STOCK_CACHE[sku] = stock_of(client, sku)
    return len(STOCK_CACHE)
