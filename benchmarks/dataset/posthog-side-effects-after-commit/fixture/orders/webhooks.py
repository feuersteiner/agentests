"""The warehouse's webhook: the warehouse packs, holds and restocks from what it is told here."""

from store import config, http


def notify_warehouse(event: str, order_id: int, items: list[dict]) -> None:
    """Tell the warehouse about an order, for example `order.placed`."""
    http.post_json(
        config.WAREHOUSE_HOOK,
        {"event": event, "order": order_id, "items": [{"sku": item["sku"], "quantity": item["quantity"]} for item in items]},
    )
