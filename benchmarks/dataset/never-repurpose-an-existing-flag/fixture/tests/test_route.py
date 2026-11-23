import pytest

from router.flags import ORDER_FLAGS
from router.route import Rejected, route
from router.settings import DEFAULTS
from router.wire import Order


def order(flags=0, qty=100):
    return Order(order_id=1, symbol="IBM", side="B", qty=qty, price_cents=18_250, flags=flags)


def test_plain_order_goes_to_the_venue():
    assert route(order(), DEFAULTS).destination == "XNYS"


def test_venue_comes_from_the_settings():
    settings = {**DEFAULTS, "venue": "XNAS"}
    assert route(order(), settings).destination == "XNAS"


def test_flags_reach_the_venue_unchanged():
    flags = ORDER_FLAGS["IOC"] | ORDER_FLAGS["HIDDEN"]
    assert route(order(flags), DEFAULTS).order.flags == flags


def test_oversized_order_is_rejected():
    with pytest.raises(Rejected):
        route(order(qty=60_000), DEFAULTS)


def test_empty_order_is_rejected():
    with pytest.raises(Rejected):
        route(order(qty=0), DEFAULTS)


def test_test_orders_need_the_setting():
    with pytest.raises(Rejected):
        route(order(ORDER_FLAGS["TEST"]), DEFAULTS)
    settings = {**DEFAULTS, "test_orders_allowed": True}
    assert route(order(ORDER_FLAGS["TEST"]), settings).destination == "SIMULATOR"


def test_peg_orders_need_the_setting():
    with pytest.raises(Rejected):
        route(order(ORDER_FLAGS["PEG"]), DEFAULTS)
    settings = {**DEFAULTS, "peg_enabled": True}
    routed = route(order(ORDER_FLAGS["PEG"]), settings)
    assert routed.destination == "PEG-ENGINE"
    assert routed.order.price_cents == 18_249
