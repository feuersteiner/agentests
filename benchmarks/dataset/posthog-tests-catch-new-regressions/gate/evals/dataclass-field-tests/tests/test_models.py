from decimal import Decimal

from pricing.discounts import Cart, Quote, apply_discounts


def test_cart_voucher_defaults_to_zero():
    assert Cart(subtotal=Decimal("40.00")).voucher == Decimal("0.00")


def test_apply_discounts_returns_a_quote():
    quote = apply_discounts(Cart(subtotal=Decimal("40.00")), coupon_pct=10, loyalty_pct=5)
    assert isinstance(quote, Quote)
