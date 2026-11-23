from datetime import timedelta

import pytest

from app.logic import orders

MUG = {"product": "mug", "quantity": 2, "unit_price_cents": 1200}
LAMP = {"product": "lamp", "quantity": 1, "unit_price_cents": 6400}


def test_small_order_pays_flat_shipping(db, now):
    order = orders.create_order(db, customer_id=1, items=[MUG], now=now)
    assert (order.status, order.shipping_cents, order.total_cents) == ("pending", 500, 2900)


def test_shipping_is_free_from_fifty(db, now):
    order = orders.create_order(db, customer_id=1, items=[MUG, LAMP], now=now)
    assert (order.shipping_cents, order.total_cents) == (0, 8800)


@pytest.mark.parametrize(
    "customer_id, items",
    [(99, [MUG]), (1, []), (1, [{"product": "mug", "quantity": 0, "unit_price_cents": 1200}])],
)
def test_create_order_rejects_bad_input(db, now, customer_id, items):
    with pytest.raises(orders.OrderError):
        orders.create_order(db, customer_id=customer_id, items=items, now=now)


def test_pay_then_ship(db, now):
    order = orders.create_order(db, customer_id=1, items=[MUG], now=now)
    paid = orders.mark_paid(db, order.id, now=now + timedelta(hours=1))
    shipped = orders.mark_shipped(db, order.id, now=now + timedelta(days=1))
    assert paid.status == "paid" and paid.paid_at == "2026-11-02T10:30:00+00:00"
    assert shipped.status == "shipped" and shipped.shipped_at == "2026-11-03T09:30:00+00:00"


def test_cannot_ship_an_unpaid_order(db, now):
    order = orders.create_order(db, customer_id=1, items=[MUG], now=now)
    with pytest.raises(orders.OrderError):
        orders.mark_shipped(db, order.id, now=now)


def test_fetch_unknown_order(db):
    with pytest.raises(orders.OrderNotFound):
        orders.fetch_order(db, 404)


def test_list_orders_filters_by_customer_and_status(db, now):
    first = orders.create_order(db, customer_id=1, items=[MUG], now=now)
    orders.create_order(db, customer_id=2, items=[LAMP], now=now)
    orders.mark_paid(db, first.id, now=now)
    assert [order.customer_id for order in orders.list_orders(db, customer_id=2)] == [2]
    assert [order.id for order in orders.list_orders(db, status="paid")] == [first.id]
