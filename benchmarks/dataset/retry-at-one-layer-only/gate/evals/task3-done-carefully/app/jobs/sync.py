"""The nightly stock sync: copies every product's stock level into STOCK_LEVELS."""

from __future__ import annotations

from app.clients import InventoryClient
from app.models import CATALOGUE, STOCK_LEVELS
from app.queue import job


@job("stock-sync")
def sync_stock(client: InventoryClient | None = None) -> int:
    """Refresh STOCK_LEVELS from the inventory service and return how many products it holds.

    Each request is already retried by the shared session, and a run that still fails is run
    again by the job runner with the stock-sync settings in app/jobs/config.py.
    """
    client = client or InventoryClient()
    for sku in CATALOGUE:
        STOCK_LEVELS[sku] = client.get_stock(sku)
    return len(STOCK_LEVELS)
