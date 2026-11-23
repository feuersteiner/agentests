"""POST /checkout: checks stock, prices the cart and places the order."""

from __future__ import annotations

from app.clients import InventoryClient, PricingClient
from app.http import HTTPError, TransportError
from app.models import CATALOGUE, format_price, place_order


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
        try:
            in_stock = inventory.get_stock(sku)
        except (HTTPError, TransportError):
            # The shared session has already retried the stock check with backoff; tell the
            # app to try again shortly rather than failing with a 500.
            return 503, {"error": "inventory unavailable", "sku": sku, "retry_after": 5}
        if in_stock < quantity:
            return 409, {"error": "out of stock", "sku": sku}
        total += pricing.get_price(sku) * quantity

    order_id = place_order(lines, total)
    return 201, {"order_id": order_id, "total": total, "total_display": format_price(total)}
