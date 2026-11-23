from decimal import Decimal

from pricing import discounts
from pricing.discounts import Cart, apply_discounts


def test_coupon_then_loyalty_are_taken_in_turn(monkeypatch):
    taken = []
    take_pct = discounts._take_pct

    def spy(amount, pct):
        taken.append(pct)
        return take_pct(amount, pct)

    monkeypatch.setattr(discounts, "_take_pct", spy)
    apply_discounts(Cart(subtotal=Decimal("100.00")), coupon_pct=10, loyalty_pct=5)
    assert taken == [10, 5]
