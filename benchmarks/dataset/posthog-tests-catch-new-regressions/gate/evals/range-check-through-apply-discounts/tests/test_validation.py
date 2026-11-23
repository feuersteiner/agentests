from decimal import Decimal

import pytest

from pricing.discounts import Cart, apply_discounts


@pytest.mark.parametrize("discounts", [{"coupon_pct": -1}, {"loyalty_pct": 101}])
def test_percentage_outside_0_to_100_is_rejected(discounts):
    with pytest.raises(ValueError):
        apply_discounts(Cart(subtotal=Decimal("100.00")), **discounts)
