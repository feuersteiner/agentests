"""The catalogue, the stock levels the product pages show, orders, and prices as text."""

from __future__ import annotations

CATALOGUE = {
    "HAM-16": "Claw hammer, 16 oz",
    "DRL-18V": "Cordless drill, 18 V",
    "SCR-100": "Wood screws, box of 100",
}

# Units in stock per SKU, refreshed every night by the stock-sync job.
STOCK_CACHE: dict[str, int] = {}

ORDERS: list[dict] = []


def place_order(lines: list[dict], total: int) -> str:
    order_id = f"ord_{len(ORDERS) + 1}"
    ORDERS.append({"id": order_id, "lines": lines, "total": total})
    return order_id


def format_price(pence: int) -> str:
    pounds, rest = divmod(pence, 100)
    return f"£{pounds}.{rest}"
