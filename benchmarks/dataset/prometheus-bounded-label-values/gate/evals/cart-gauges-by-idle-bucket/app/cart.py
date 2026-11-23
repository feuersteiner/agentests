"""Shopping carts, one per user, kept in memory."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from app.metrics import OPEN_CART_ITEMS, OPEN_CARTS
from app.models import Product

log = logging.getLogger(__name__)

# How long a cart has gone unchanged, as (upper limit in seconds, bucket name).
IDLE_BUCKETS = ((3600, "under_1h"), (86400, "1h_to_24h"), (float("inf"), "over_24h"))


@dataclass
class Cart:
    user_id: int
    items: dict[str, int] = field(default_factory=dict)  # SKU -> quantity
    updated_at: float = field(default_factory=time.time)

    def add(self, sku: str, quantity: int = 1) -> None:
        if quantity < 1:
            raise ValueError("quantity must be at least 1")
        self.items[sku] = quantity
        self.updated_at = time.time()

    def remove(self, sku: str) -> None:
        self.items.pop(sku, None)
        self.updated_at = time.time()

    def item_count(self) -> int:
        return sum(self.items.values())

    def total_cents(self, products: dict[str, Product]) -> int:
        return sum(products[sku].price_cents * quantity for sku, quantity in self.items.items())


class CartStore:
    def __init__(self) -> None:
        self._carts: dict[int, Cart] = {}

    def get(self, user_id: int) -> Cart:
        """The user's cart, created empty the first time it is asked for."""
        if user_id not in self._carts:
            self._carts[user_id] = Cart(user_id)
        return self._carts[user_id]

    def all(self) -> list[Cart]:
        return list(self._carts.values())

    def clear(self, user_id: int) -> None:
        self._carts.pop(user_id, None)


CARTS = CartStore()


def idle_bucket(idle_seconds: float) -> str:
    for limit, name in IDLE_BUCKETS:
        if idle_seconds < limit:
            return name
    return IDLE_BUCKETS[-1][1]


def record_cart_metrics(store: CartStore, now: float | None = None) -> None:
    """Sets the open-cart gauges from the store. GET /metrics calls it before rendering."""
    now = time.time() if now is None else now
    carts = {name: 0 for _, name in IDLE_BUCKETS}
    items = {name: 0 for _, name in IDLE_BUCKETS}
    for cart in store.all():
        if not cart.items:
            continue
        bucket = idle_bucket(now - cart.updated_at)
        carts[bucket] += 1
        items[bucket] += cart.item_count()
        if bucket == "over_24h":
            log.info("cart of user %s idle with %s items", cart.user_id, cart.item_count())
    for bucket in carts:
        OPEN_CARTS.labels(idle=bucket).set(carts[bucket])
        OPEN_CART_ITEMS.labels(idle=bucket).set(items[bucket])
