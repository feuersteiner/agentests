from decimal import Decimal

from pricing.discounts import Cart, apply_discounts


def cart(subtotal, voucher="0.00"):
    return Cart(subtotal=Decimal(subtotal), voucher=Decimal(voucher))


def test_ten_and_five_percent_stack():
    quote = apply_discounts(cart("100.00"), coupon_pct=10, loyalty_pct=5)
    assert quote.total == Decimal("85.50")


def test_twenty_and_ten_percent_stack():
    quote = apply_discounts(cart("100.00"), coupon_pct=20, loyalty_pct=10)
    assert quote.total == Decimal("72.00")


def test_fifty_and_fifty_percent_stack():
    quote = apply_discounts(cart("100.00"), coupon_pct=50, loyalty_pct=50)
    assert quote.total == Decimal("25.00")
