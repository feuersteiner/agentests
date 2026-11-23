"""The Power Peg (PEG) handler.

A PEG order follows the market: the peg engine starts it one cent less aggressive than its limit
and re-prices it as the quote moves, until it fills.
"""

from dataclasses import replace

from router.wire import Order

ENGINE = "PEG-ENGINE"


def handle(order: Order) -> Order:
    """The child order the peg engine starts from."""
    step = -1 if order.side == "B" else 1
    return replace(order, price_cents=order.price_cents + step)
