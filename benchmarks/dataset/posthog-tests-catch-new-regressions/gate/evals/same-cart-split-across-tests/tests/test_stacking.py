from decimal import Decimal

from pricing.discounts import Cart, apply_discounts


def cart(subtotal, voucher="0.00"):
    return Cart(subtotal=Decimal(subtotal), voucher=Decimal(voucher))


def test_coupon_and_loyalty_stack():
    quote = apply_discounts(cart("100.00"), coupon_pct=10, loyalty_pct=5)
    assert quote.total == Decimal("85.50")


def test_stacked_quote_reports_the_combined_discount():
    quote = apply_discounts(cart("100.00"), coupon_pct=10, loyalty_pct=5)
    assert quote.discount == Decimal("14.50")
