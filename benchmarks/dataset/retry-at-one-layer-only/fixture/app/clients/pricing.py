"""Client for the pricing service, which holds the current price of every product."""

from __future__ import annotations

from app.http import SESSION, Session

PRICING_URL = "http://pricing.internal/v2"


class PricingClient:
    def __init__(self, session: Session = SESSION, base_url: str = PRICING_URL) -> None:
        self.session = session
        self.base_url = base_url

    def get_price(self, sku: str) -> int:
        """The product's current price in pence, VAT included."""
        response = self.session.get(f"{self.base_url}/prices/{sku}")
        return response.json()["price_pence"]
