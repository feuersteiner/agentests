"""Shopping carts, one per user, kept in memory."""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from app.models import Product


@dataclass
class Cart:
    user_id: int
    items: dict[str, int] = field(default_factory=dict)  # SKU -> quantity
    updated_at: float = field(default_factory=time.time)

    def add(self, sku: str, quantity: int = 1) -> None:
        if quantity < 1:
            raise ValueError("quantity must be at least 1")
        self.items[sku] = self.items.get(sku, 0) + quantity
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
