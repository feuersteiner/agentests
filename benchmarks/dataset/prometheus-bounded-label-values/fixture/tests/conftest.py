import pytest

import telemetry
from app import billing
from app.cart import CARTS
from app.models import PRODUCTS, USERS, Product, User


class FakeGateway:
    def __init__(self) -> None:
        self.charges: list[tuple[str, int]] = []
        self.decline: billing.PaymentDeclined | None = None

    def charge(self, card_token: str, amount_cents: int) -> str:
        if self.decline is not None:
            raise self.decline
        self.charges.append((card_token, amount_cents))
        return f"pay_{len(self.charges)}"


@pytest.fixture(autouse=True)
def shop(monkeypatch):
    """Two customers and three products, empty carts, fresh metrics and a fake gateway."""
    USERS.clear()
    USERS.update({1: User(1, "ada@example.com", "plus"), 2: User(2, "sam@example.com", "free")})
    PRODUCTS.clear()
    PRODUCTS.update(
        {
            "EGG-6": Product("EGG-6", "Six free-range eggs", 245),
            "LEEK-1": Product("LEEK-1", "Leek", 60),
            "BOX-VEG": Product("BOX-VEG", "Seasonal veg box", 1850),
        }
    )
    CARTS._carts.clear()
    telemetry.reset()
    fake = FakeGateway()
    monkeypatch.setattr(billing, "gateway", fake)
    return fake
