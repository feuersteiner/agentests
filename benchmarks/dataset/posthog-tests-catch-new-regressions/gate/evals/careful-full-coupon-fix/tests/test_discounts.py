from decimal import Decimal

import pytest

from pricing.discounts import Cart, apply_discounts


def cart(subtotal, voucher="0.00"):
    return Cart(subtotal=Decimal(subtotal), voucher=Decimal(voucher))


@pytest.mark.parametrize(
    "discounts, total",
    [
        ({}, "100.00"),
        ({"coupon_pct": 10}, "90.00"),
        ({"loyalty_pct": 5}, "95.00"),
        ({"coupon_pct": 0}, "100.00"),
    ],
)
def test_percentage_discount_comes_off_the_subtotal(discounts, total):
    quote = apply_discounts(cart("100.00"), **discounts)
    assert quote.total == Decimal(total)
    assert quote.discount == Decimal("100.00") - Decimal(total)


@pytest.mark.parametrize(
    "discounts, total",
    [
        ({}, "95.00"),
        ({"coupon_pct": 10}, "85.00"),
    ],
)
def test_voucher_comes_off_after_the_percentage_discount(discounts, total):
    quote = apply_discounts(cart("100.00", voucher="5.00"), **discounts)
    assert quote.total == Decimal(total)


@pytest.mark.parametrize(
    "subtotal, coupon_pct, total",
    [
        ("19.99", 15, "16.99"),  # 16.9915
        ("0.05", 50, "0.03"),  # 0.025 rounds up, not to the even 0.02
    ],
)
def test_total_is_rounded_half_up_to_the_cent(subtotal, coupon_pct, total):
    quote = apply_discounts(cart(subtotal), coupon_pct=coupon_pct)
    assert quote.total == Decimal(total)


@pytest.mark.parametrize(
    "voucher, discounts",
    [
        ("5.00", {"coupon_pct": 100}),  # nothing is left for the voucher to come off
        ("30.00", {"coupon_pct": 50, "loyalty_pct": 50}),  # the voucher is larger than the 25.00 left
    ],
)
def test_total_never_goes_below_zero(voucher, discounts):
    quote = apply_discounts(cart("100.00", voucher=voucher), **discounts)
    assert quote.total == Decimal("0.00")
    assert quote.discount == Decimal("100.00")
