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


def test_coupon_and_loyalty_stack():
    quote = apply_discounts(cart("100.00"), coupon_pct=10, loyalty_pct=5)
    assert quote.total == Decimal("85.50")


def test_loyalty_applies_to_amount_after_coupon():
    # 100.00 - 10% = 90.00, then 90.00 - 5% = 85.50 (not 100.00 - 15% = 85.00)
    quote = apply_discounts(cart("100.00"), coupon_pct=10, loyalty_pct=5)
    assert quote.total != Decimal("85.00")
    assert quote.total == Decimal("85.50")


def test_stacked_discount_amount():
    quote = apply_discounts(cart("100.00"), coupon_pct=10, loyalty_pct=5)
    assert quote.discount == Decimal("14.50")


def test_stacking_with_larger_percentages():
    quote = apply_discounts(cart("200.00"), coupon_pct=25, loyalty_pct=10)
    assert quote.total == Decimal("135.00")


def test_stacking_with_zero_coupon():
    quote = apply_discounts(cart("100.00"), coupon_pct=0, loyalty_pct=5)
    assert quote.total == Decimal("95.00")


def test_stacking_with_zero_loyalty():
    quote = apply_discounts(cart("100.00"), coupon_pct=10, loyalty_pct=0)
    assert quote.total == Decimal("90.00")


def test_stacking_with_full_coupon():
    quote = apply_discounts(cart("100.00"), coupon_pct=100, loyalty_pct=5)
    assert quote.total == Decimal("0.00")


def test_stacking_with_voucher():
    quote = apply_discounts(cart("100.00", voucher="5.00"), coupon_pct=10, loyalty_pct=5)
    assert quote.total == Decimal("80.50")


def test_stacking_rounds_half_up():
    quote = apply_discounts(cart("19.99"), coupon_pct=15, loyalty_pct=10)
    assert quote.total == Decimal("15.29")


def test_stacking_rejects_invalid_loyalty():
    with pytest.raises(ValueError):
        apply_discounts(cart("100.00"), coupon_pct=10, loyalty_pct=150)
