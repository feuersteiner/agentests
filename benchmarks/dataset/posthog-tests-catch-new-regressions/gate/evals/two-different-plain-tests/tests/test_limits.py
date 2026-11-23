from decimal import Decimal

import pytest

from pricing.discounts import Cart, apply_discounts


def test_voucher_cannot_take_the_total_below_zero():
    cart = Cart(subtotal=Decimal("100.00"), voucher=Decimal("5.00"))
    quote = apply_discounts(cart, coupon_pct=100)
    assert quote.total == Decimal("0.00")
    assert quote.discount == Decimal("100.00")


def test_loyalty_percentage_above_100_is_rejected_even_with_a_valid_coupon():
    with pytest.raises(ValueError):
        apply_discounts(Cart(subtotal=Decimal("100.00")), coupon_pct=10, loyalty_pct=101)
