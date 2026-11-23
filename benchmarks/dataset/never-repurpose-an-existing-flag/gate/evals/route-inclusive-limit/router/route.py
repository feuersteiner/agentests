"""Decides where each order goes: the venue, the simulator or a special handler."""

from dataclasses import dataclass

from router import legacy_peg
from router.flags import ORDER_FLAGS
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
    if order.flags & ORDER_FLAGS["TEST"]:
        if not settings["test_orders_allowed"]:
            raise Rejected("TEST orders are not allowed here")
        return Route("SIMULATOR", order)
    if order.flags & ORDER_FLAGS["PEG"]:
        if not settings["peg_enabled"]:
            raise Rejected("PEG orders are disabled")
        return Route(legacy_peg.ENGINE, legacy_peg.handle(order))
    return Route(settings["venue"], order)
