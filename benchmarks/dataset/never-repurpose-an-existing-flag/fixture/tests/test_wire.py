import pytest

from router.wire import SIZE, Order, WireError, decode, encode

ORDER = Order(order_id=42, symbol="IBM", side="S", qty=300, price_cents=18_250, flags=0x09)


def test_message_is_27_bytes():
    assert SIZE == 27
    assert len(encode(ORDER)) == SIZE


def test_round_trip():
    assert decode(encode(ORDER)) == ORDER


def test_flags_are_the_last_byte():
    assert encode(ORDER)[-1] == 0x09


def test_unknown_version_is_refused():
    data = bytes([2]) + encode(ORDER)[1:]
    with pytest.raises(WireError):
        decode(data)
