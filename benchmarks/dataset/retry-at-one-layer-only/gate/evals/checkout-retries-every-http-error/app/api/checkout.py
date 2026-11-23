"""POST /checkout: checks stock, prices the cart and places the order."""

from __future__ import annotations

import time

from app.clients import InventoryClient, PricingClient
from app.http import HTTPError
from app.models import CATALOGUE, format_price, place_order

STOCK_CHECK_ATTEMPTS = 3


def check_stock(inventory: InventoryClient, sku: str) -> int:
    """Ask for the stock level, trying again when the inventory service answers with an error."""
    for attempt in range(1, STOCK_CHECK_ATTEMPTS + 1):
        try:
            return inventory.get_stock(sku)
        except HTTPError:
            if attempt == STOCK_CHECK_ATTEMPTS:
                raise
            time.sleep(0.5 * attempt)
    raise AssertionError("unreachable")


def handle_checkout(
    body: dict,
    inventory: InventoryClient | None = None,
    pricing: PricingClient | None = None,
) -> tuple[int, dict]:
    inventory = inventory or InventoryClient()
    pricing = pricing or PricingClient()
    lines = body.get("lines") or []
    if not lines:
        return 400, {"error": "cart is empty"}

    total = 0
    for line in lines:
        sku, quantity = line["sku"], line["quantity"]
        if sku not in CATALOGUE:
            return 404, {"error": "unknown product", "sku": sku}
        if check_stock(inventory, sku) < quantity:
            return 409, {"error": "out of stock", "sku": sku}
        total += pricing.get_price(sku) * quantity

    order_id = place_order(lines, total)
    return 201, {"order_id": order_id, "total": total, "total_display": format_price(total)}
