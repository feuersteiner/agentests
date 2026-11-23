from decimal import Decimal

import pytest

from pricing.discounts import Cart


@pytest.fixture
def full_price_cart():
    return Cart(subtotal=Decimal("100.00"))
