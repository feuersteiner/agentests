"""Builds orders for the desks' trading tools and sends them to the router."""

from router.flags import ORDER_FLAGS
from router.wire import Order, encode


def build_order(
    order_id: int,
    symbol: str,
    side: str,
    qty: int,
    price_cents: int,
    *,
    ioc: bool = False,
    post_only: bool = False,
    hidden: bool = False,
    short: bool = False,
    iso: bool = False,
    aon: bool = False,
    test: bool = False,
    rlp: bool = False,
) -> Order:
    if side not in ("B", "S"):
        raise ValueError(f"side must be 'B' or 'S', not {side!r}")
    options = {
        "IOC": ioc,
        "POST_ONLY": post_only,
        "HIDDEN": hidden,
        "SHORT": short,
        "ISO": iso,
        "AON": aon,
        "TEST": test,
    }
    flags = 0
    for name, wanted in options.items():
        if wanted:
            flags |= ORDER_FLAGS[name]
    if rlp:
        # All eight bits are taken; nobody sends PEG any more, so RLP orders use its bit.
        flags |= ORDER_FLAGS["PEG"]
    return Order(order_id, symbol.upper(), side, qty, price_cents, flags)


def send(order: Order, transport) -> None:
    """Writes the encoded order to `transport`, a socket or anything else with `sendall`."""
    transport.sendall(encode(order))
