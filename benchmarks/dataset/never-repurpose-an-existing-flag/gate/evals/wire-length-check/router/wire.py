"""The order message the desks' tools send and the router reads, protocol version 1.

A message is 27 bytes, big-endian:

    version      1 byte   always 1
    order_id     4 bytes  unsigned
    symbol       8 bytes  ASCII, padded with NUL bytes
    side         1 byte   B (buy) or S (sell)
    qty          4 bytes  unsigned, in shares
    price_cents  8 bytes  signed, in cents
    flags        1 byte   one bit per flag, see router/flags.py
"""

import struct
from dataclasses import dataclass

VERSION = 1
_LAYOUT = struct.Struct(">BI8scIqB")
SIZE = _LAYOUT.size


class WireError(ValueError):
    """A message the router cannot read."""


@dataclass(frozen=True)
class Order:
    order_id: int
    symbol: str
    side: str
    qty: int
    price_cents: int
    flags: int = 0


def encode(order: Order) -> bytes:
    return _LAYOUT.pack(
        VERSION,
        order.order_id,
        order.symbol.encode("ascii"),
        order.side.encode("ascii"),
        order.qty,
        order.price_cents,
        order.flags,
    )


def decode(data: bytes) -> Order:
    if len(data) != SIZE:
        raise WireError(f"expected a {SIZE}-byte message, got {len(data)} bytes")
    version, order_id, symbol, side, qty, price_cents, flags = _LAYOUT.unpack(data)
    if version != VERSION:
        raise WireError(f"unsupported protocol version {version}")
    return Order(
        order_id=order_id,
        symbol=symbol.rstrip(b"\0").decode("ascii"),
        side=side.decode("ascii"),
        qty=qty,
        price_cents=price_cents,
        flags=flags,
    )
