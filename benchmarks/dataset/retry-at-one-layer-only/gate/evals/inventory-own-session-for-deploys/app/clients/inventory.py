"""Client for the inventory service, which knows what each warehouse holds."""

from __future__ import annotations

from app.http import HTTPError, Retry, Session

INVENTORY_URL = "http://inventory.internal/v1"

# A deploy of the inventory service takes up to ten seconds, longer than the shared session's
# backoff lasts, so inventory lookups get a session of their own with a longer backoff.
INVENTORY_SESSION = Session(
    retry=Retry(total=4, backoff_factor=1.0, status_forcelist=(502, 503, 504)),
    timeout=2.0,
)


class UnknownSku(Exception):
    """The inventory service has never heard of this product."""


class InventoryClient:
    def __init__(self, session: Session = INVENTORY_SESSION, base_url: str = INVENTORY_URL) -> None:
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
