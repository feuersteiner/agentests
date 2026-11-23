"""Builds orders for the desks' trading tools and sends them to the router."""

from router.flags import ORDER_FLAGS
from router.wire import Order, encode

MAX_SYMBOL_LENGTH = 8


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
) -> Order:
    if side not in ("B", "S"):
        raise ValueError(f"side must be 'B' or 'S', not {side!r}")
    if qty < 1:
        raise ValueError(f"quantity must be at least 1, not {qty}")
    if len(symbol) > MAX_SYMBOL_LENGTH:
        raise ValueError(f"symbol {symbol!r} is longer than {MAX_SYMBOL_LENGTH} characters")
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
    return Order(order_id, symbol.upper(), side, qty, price_cents, flags)


def send(order: Order, transport) -> None:
    """Writes the encoded order to `transport`, a socket or anything else with `sendall`."""
    transport.sendall(encode(order))
