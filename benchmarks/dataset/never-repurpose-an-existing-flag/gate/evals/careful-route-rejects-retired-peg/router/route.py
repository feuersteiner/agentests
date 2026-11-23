"""Decides where each order goes: the venue, the simulator or the RLP book."""

from dataclasses import dataclass

from router import rlp
from router.flags import EXT_FLAGS, ORDER_FLAGS
from router.wire import Order


class Rejected(Exception):
    """The router refuses the order; the message says why."""


@dataclass(frozen=True)
class Route:
    destination: str
    order: Order


def route(order: Order, settings: dict) -> Route:
    limit = settings["max_order_qty"]
    if not 0 < order.qty <= limit:
        raise Rejected(f"quantity {order.qty} is outside the limit of {limit} shares")
    if order.flags & ORDER_FLAGS["PEG"]:
        raise Rejected("PEG orders were retired in 2019 and are no longer accepted")
    if order.flags & ORDER_FLAGS["TEST"]:
        if not settings["test_orders_allowed"]:
            raise Rejected("TEST orders are not allowed here")
        return Route("SIMULATOR", order)
    if order.ext_flags & EXT_FLAGS["RLP"]:
        if not settings["rlp_enabled"]:
            raise Rejected("RLP orders are disabled")
        return Route(rlp.DESTINATION, rlp.handle(order))
    return Route(settings["venue"], order)
