"""Client for the inventory service, which knows what each warehouse holds."""

from __future__ import annotations

import time

from app.http import SESSION, HTTPError, Session, TransportError

INVENTORY_URL = "http://inventory.internal/v1"

# The inventory service drops connections and answers 503 for a few seconds while it deploys.
ATTEMPTS = 4
RETRY_DELAY_SECONDS = 0.5


class UnknownSku(Exception):
    """The inventory service has never heard of this product."""


class InventoryClient:
    def __init__(self, session: Session = SESSION, base_url: str = INVENTORY_URL) -> None:
        self.session = session
        self.base_url = base_url

    def get_stock(self, sku: str) -> int:
        """Units of the product in stock, summed over every warehouse.

        Tries up to ATTEMPTS times, waiting a little longer each time, so a deploy of the
        inventory service does not fail the lookup.
        """
        for attempt in range(1, ATTEMPTS + 1):
            try:
                response = self.session.get(f"{self.base_url}/stock/{sku}")
                break
            except HTTPError as exc:
                if exc.status == 404:
                    raise UnknownSku(sku) from exc
                if attempt == ATTEMPTS:
                    raise
            except TransportError:
                if attempt == ATTEMPTS:
                    raise
            time.sleep(RETRY_DELAY_SECONDS * attempt)
        return sum(warehouse["units"] for warehouse in response.json()["warehouses"])
