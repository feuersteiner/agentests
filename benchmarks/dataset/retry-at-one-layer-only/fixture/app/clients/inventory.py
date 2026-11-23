"""Client for the inventory service, which knows what each warehouse holds."""

from __future__ import annotations

from app.http import SESSION, HTTPError, Session

INVENTORY_URL = "http://inventory.internal/v1"


class UnknownSku(Exception):
    """The inventory service has never heard of this product."""


class InventoryClient:
    def __init__(self, session: Session = SESSION, base_url: str = INVENTORY_URL) -> None:
        self.session = session
        self.base_url = base_url

    def get_stock(self, sku: str) -> int:
        """Units of the product in stock, summed over every warehouse."""
        try:
            response = self.session.get(f"{self.base_url}/stock/{sku}")
        except HTTPError as exc:
            if exc.status == 404:
                raise UnknownSku(sku) from exc
            raise
        return sum(warehouse["units"] for warehouse in response.json()["warehouses"])
