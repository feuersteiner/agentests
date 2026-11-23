"""POST /checkout: checks stock, prices the cart and places the order."""

from __future__ import annotations

from app.clients import InventoryClient, PricingClient
from app.models import CATALOGUE, place_order


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
        if inventory.get_stock(sku) < quantity:
            return 409, {"error": "out of stock", "sku": sku}
        total += pricing.get_price(sku) * quantity

    order_id = place_order(lines, total)
    return 201, {"order_id": order_id, "total": total}
