import pytest

from app import models, orders
from app.errors import NotFound


def test_place_order_without_coupon():
    order_id = orders.place_order(1, {"CARD-500": 1, "STICKER-50": 2})
    assert orders.order_total(order_id) == 3000 + 2 * 800


def test_place_order_applies_the_coupon():
    order_id = orders.place_order(1, {"POSTER-A2": 2}, coupon_code="SPRING10")
    assert orders.order_total(order_id) == 2700


def test_place_order_counts_the_coupon_use():
    orders.place_order(2, {"POSTER-A2": 1}, coupon_code="SPRING10")
    assert models.get_coupon("SPRING10").times_used == 1


def test_place_order_with_unknown_product():
    with pytest.raises(NotFound):
        orders.place_order(1, {"MUG-1": 1})
