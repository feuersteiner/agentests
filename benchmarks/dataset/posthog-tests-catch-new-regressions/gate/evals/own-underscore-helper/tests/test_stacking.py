from decimal import Decimal

import pytest

from pricing.discounts import Cart, apply_discounts


def _cart(subtotal, voucher="0.00"):
    return Cart(subtotal=Decimal(subtotal), voucher=Decimal(voucher))


@pytest.mark.parametrize(
    "voucher, total",
    [
        ("0.00", "54.00"),  # 80.00 less 25% is 60.00, less 10% of that is 54.00, not 52.00
        ("5.00", "49.00"),  # the voucher comes off after both percentages
    ],
)
def test_loyalty_comes_off_what_the_coupon_left(voucher, total):
    quote = apply_discounts(_cart("80.00", voucher), coupon_pct=25, loyalty_pct=10)
    assert quote.total == Decimal(total)
