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


def test_full_coupon_total_is_zero():
    quote = apply_discounts(cart("100.00"), coupon_pct=100)
    assert quote.total == Decimal("0.00")


def test_full_coupon_with_voucher_total_is_zero():
    quote = apply_discounts(cart("100.00", voucher="5.00"), coupon_pct=100)
    assert quote.total == Decimal("0.00")


def test_full_coupon_with_large_voucher_total_is_zero():
    quote = apply_discounts(cart("100.00", voucher="50.00"), coupon_pct=100)
    assert quote.total == Decimal("0.00")


def test_full_loyalty_with_voucher_total_is_zero():
    quote = apply_discounts(cart("100.00", voucher="5.00"), loyalty_pct=100)
    assert quote.total == Decimal("0.00")


def test_full_coupon_with_voucher_total_is_not_negative():
    quote = apply_discounts(cart("100.00", voucher="5.00"), coupon_pct=100)
    assert quote.total >= Decimal("0.00")
