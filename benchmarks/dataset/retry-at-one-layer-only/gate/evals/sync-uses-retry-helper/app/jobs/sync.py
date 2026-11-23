"""The nightly stock sync: copies every product's stock level into STOCK_CACHE."""

from __future__ import annotations

from app.clients import InventoryClient
from app.models import CATALOGUE, STOCK_CACHE
from app.queue import job
from app.retry import with_backoff


@job("stock-sync")
def sync_stock(client: InventoryClient | None = None) -> int:
    """Refresh STOCK_CACHE from the inventory service and return how many products it holds."""
    client = client or InventoryClient()
    for sku in CATALOGUE:
        STOCK_CACHE[sku] = with_backoff(lambda: client.get_stock(sku), attempts=3, base_delay=1.0)
    return len(STOCK_CACHE)
