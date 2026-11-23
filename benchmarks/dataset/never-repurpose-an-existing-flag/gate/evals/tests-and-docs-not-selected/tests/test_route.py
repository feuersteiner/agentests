import pytest

from router.flags import ORDER_FLAGS
from router.route import Rejected, route
from router.settings import DEFAULTS
from router.wire import Order


def order(flags=0, qty=100):
    return Order(order_id=1, symbol="IBM", side="B", qty=qty, price_cents=18_250, flags=flags)


def test_rlp_orders_use_the_old_peg_bit():
    assert ORDER_FLAGS["RLP"] == 0x04


def test_rlp_orders_go_to_the_rlp_book():
    settings = {**DEFAULTS, "rlp_enabled": True}
    routed = route(order(ORDER_FLAGS["RLP"]), settings)
    assert routed.destination == "XNYS-RLP"
    assert routed.order.price_cents == 18_251


def test_rlp_orders_need_the_setting():
    with pytest.raises(Rejected):
        route(order(ORDER_FLAGS["RLP"]), DEFAULTS)
