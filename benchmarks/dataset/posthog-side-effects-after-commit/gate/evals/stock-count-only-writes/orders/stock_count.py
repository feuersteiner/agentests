"""The yearly stock count: what the shelves hold replaces what the database believes."""

from orders import models
from store.db import transaction


def apply_stock_count(counted: dict[str, int]) -> list[str]:
    """Set each product's stock to the counted number and return the SKUs that changed."""
    changed = []
    for sku, on_shelf in counted.items():
        product = models.get_product(sku)
        if product is None:
            raise LookupError(f"product {sku} does not exist")
        if product["stock"] != on_shelf:
            changed.append(sku)

    with transaction.atomic():
        for sku in changed:
            models.change_stock(sku, counted[sku] - models.get_product(sku)["stock"])

    return changed
