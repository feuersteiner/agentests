"""Discounts taken off a cart at checkout."""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


@dataclass(frozen=True)
class Cart:
    subtotal: Decimal
    voucher: Decimal = Decimal("0.00")  # a fixed amount off, such as a 5.00 gift voucher


@dataclass(frozen=True)
class Quote:
    subtotal: Decimal
    discount: Decimal
    total: Decimal


def apply_discounts(cart, coupon_pct=None, loyalty_pct=None):
    """Price a cart after its discounts.

    The coupon comes off the subtotal first and the loyalty discount comes off
    what is left, so the two stack. The voucher comes off last. Percentages run
    from 0 to 100, and the total is rounded half up to the cent.
    """
    amount = cart.subtotal
    for pct in (coupon_pct, loyalty_pct):
        if pct is not None:
            amount = _take_pct(amount, pct)
    total = _round_money(amount - cart.voucher)
    return Quote(subtotal=cart.subtotal, discount=cart.subtotal - total, total=total)


def _take_pct(amount, pct):
    if not 0 <= pct <= 100:
        raise ValueError(f"discount must be between 0 and 100 percent, got {pct}")
    return amount * (100 - Decimal(pct)) / 100


def _round_money(amount):
    return amount.quantize(CENT, rounding=ROUND_HALF_UP)
