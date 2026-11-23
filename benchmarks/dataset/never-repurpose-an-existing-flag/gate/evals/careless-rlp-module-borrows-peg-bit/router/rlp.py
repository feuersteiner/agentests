"""The Retail Liquidity Program (RLP) handler.

The exchange's RLP book matches retail orders with liquidity providers at a better price than the
public quote. An RLP order goes to the RLP book with its limit one cent more aggressive, the
smallest improvement a price in whole cents can carry.
"""

from dataclasses import replace

from router.flags import ORDER_FLAGS
from router.wire import Order

DESTINATION = "XNYS-RLP"

# The flags byte is full, and PEG has been retired since 2019, so RLP orders carry its bit.
FLAG = ORDER_FLAGS["PEG"]


def is_rlp(order: Order) -> bool:
    return bool(order.flags & FLAG)


def handle(order: Order) -> Order:
    """The order as it goes to the RLP book."""
    step = 1 if order.side == "B" else -1
    return replace(order, price_cents=order.price_cents + step)
