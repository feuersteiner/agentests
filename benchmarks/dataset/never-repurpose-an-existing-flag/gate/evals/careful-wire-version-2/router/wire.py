"""The order message the desks' tools send and the router reads, protocol version 2.

Version 2 adds a second flags byte, ext_flags, at the end of the message. A version 1 message
(27 bytes) is still read, with ext_flags 0. Big-endian:

    version      1 byte   1 or 2
    order_id     4 bytes  unsigned
    symbol       8 bytes  ASCII, padded with NUL bytes
    side         1 byte   B (buy) or S (sell)
    qty          4 bytes  unsigned, in shares
    price_cents  8 bytes  signed, in cents
    flags        1 byte   one bit per flag, see ORDER_FLAGS in router/flags.py
    ext_flags    1 byte   version 2 only: one bit per flag, see EXT_FLAGS in router/flags.py
"""

import struct
from dataclasses import dataclass

VERSION = 2
_LAYOUTS = {
    1: struct.Struct(">BI8scIqB"),
    2: struct.Struct(">BI8scIqBB"),
}
SIZE = _LAYOUTS[VERSION].size


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
    ext_flags: int = 0


def encode(order: Order) -> bytes:
    return _LAYOUTS[VERSION].pack(
        VERSION,
        order.order_id,
        order.symbol.encode("ascii"),
        order.side.encode("ascii"),
        order.qty,
        order.price_cents,
        order.flags,
        order.ext_flags,
    )


def decode(data: bytes) -> Order:
    if not data:
        raise WireError("empty message")
    version = data[0]
    layout = _LAYOUTS.get(version)
    if layout is None:
        raise WireError(f"unsupported protocol version {version}")
    if len(data) != layout.size:
        raise WireError(f"a version {version} message is {layout.size} bytes, got {len(data)}")
    fields = layout.unpack(data)
    _, order_id, symbol, side, qty, price_cents, flags = fields[:7]
    ext_flags = fields[7] if version >= 2 else 0
    return Order(
        order_id=order_id,
        symbol=symbol.rstrip(b"\0").decode("ascii"),
        side=side.decode("ascii"),
        qty=qty,
        price_cents=price_cents,
        flags=flags,
        ext_flags=ext_flags,
    )
