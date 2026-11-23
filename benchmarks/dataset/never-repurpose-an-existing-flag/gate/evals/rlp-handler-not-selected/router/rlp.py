"""The Retail Liquidity Program (RLP) handler.

The exchange's RLP book matches retail orders with liquidity providers at a better price than the
public quote. An RLP order goes to the RLP book with its limit improved by IMPROVEMENT_CENTS, the
smallest improvement a price in whole cents can carry.
"""

from dataclasses import replace

from router.wire import Order

DESTINATION = "XNYS-RLP"
IMPROVEMENT_CENTS = 1


def handle(order: Order) -> Order:
    """The order as it goes to the RLP book: a buy may pay a cent more, a sell take a cent less."""
    step = IMPROVEMENT_CENTS if order.side == "B" else -IMPROVEMENT_CENTS
    return replace(order, price_cents=order.price_cents + step)
