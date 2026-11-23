import pytest

from clients.sender import build_order, send
from router.flags import ORDER_FLAGS
from router.wire import encode


class FakeSocket:
    def __init__(self):
        self.sent = b""

    def sendall(self, data):
        self.sent += data


def test_build_order_sets_the_flags_asked_for():
    order = build_order(7, "msft", "B", 100, 41_000, ioc=True, hidden=True)
    assert order.symbol == "MSFT"
    assert order.flags == ORDER_FLAGS["IOC"] | ORDER_FLAGS["HIDDEN"]


def test_build_order_without_options_sets_no_flags():
    assert build_order(7, "MSFT", "S", 100, 41_000).flags == 0


def test_unknown_side_is_refused():
    with pytest.raises(ValueError):
        build_order(7, "MSFT", "X", 100, 41_000)


def test_send_writes_the_encoded_order():
    sock = FakeSocket()
    order = build_order(7, "MSFT", "B", 100, 41_000, short=True)
    send(order, sock)
    assert sock.sent == encode(order)
