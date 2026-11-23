from decimal import Decimal

import pytest

from pricing.discounts import Cart, apply_discounts


def cart(subtotal, voucher="0.00"):
    return Cart(subtotal=Decimal(subtotal), voucher=Decimal(voucher))


@pytest.mark.parametrize(
    "voucher, total",
    [
        ("0.00", "85.50"),  # loyalty comes off what the coupon left, not the subtotal
        ("5.00", "80.50"),  # the voucher still comes off after both percentages
    ],
)
def test_coupon_and_loyalty_stack(voucher, total):
    quote = apply_discounts(cart("100.00", voucher), coupon_pct=10, loyalty_pct=5)
    assert quote.total == Decimal(total)
    assert quote.discount == Decimal("100.00") - Decimal(total)


def test_loyalty_outside_0_to_100_is_rejected_with_a_coupon():
    with pytest.raises(ValueError):
        apply_discounts(cart("100.00"), coupon_pct=10, loyalty_pct=101)
