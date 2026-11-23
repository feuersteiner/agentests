"""Decides where each order goes: the venue, the simulator or the RLP book."""

from dataclasses import dataclass

from router import rlp
from router.flags import has_flag
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
    if has_flag(order.flags, "TEST"):
        if not settings["test_orders_allowed"]:
            raise Rejected("TEST orders are not allowed here")
        return Route("SIMULATOR", order)
    if has_flag(order.flags, "PEG"):
        if not settings["rlp_enabled"]:
            raise Rejected("RLP orders are disabled")
        return Route(rlp.DESTINATION, rlp.handle(order))
    return Route(settings["venue"], order)
