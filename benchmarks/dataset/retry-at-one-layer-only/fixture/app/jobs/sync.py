"""The nightly stock sync: copies every product's stock level into STOCK_CACHE."""

from __future__ import annotations

from app.clients import InventoryClient
from app.models import CATALOGUE, STOCK_CACHE
from app.queue import job


@job("stock-sync")
def sync_stock(client: InventoryClient | None = None) -> int:
    """Refresh STOCK_CACHE from the inventory service and return how many products it holds."""
    client = client or InventoryClient()
    for sku in CATALOGUE:
        STOCK_CACHE[sku] = client.get_stock(sku)
    return len(STOCK_CACHE)
