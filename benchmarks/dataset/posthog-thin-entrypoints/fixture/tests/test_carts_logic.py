from datetime import timedelta

import pytest

from app.logic import carts


def test_open_cart_is_empty(db, now):
    cart = carts.open_cart(db, customer_id=1, now=now)
    assert (cart.status, cart.items) == ("open", [])


def test_adding_a_held_product_raises_its_quantity(db, now):
    cart = carts.open_cart(db, customer_id=1, now=now)
    carts.add_item(db, cart.id, "mug", 1, now=now)
    later = now + timedelta(minutes=5)
    cart = carts.add_item(db, cart.id, "mug", 2, now=later)
    assert cart.items == [{"product": "mug", "quantity": 3}]
    assert cart.updated_at == later.isoformat()


def test_add_item_rejects_zero_quantity(db, now):
    cart = carts.open_cart(db, customer_id=1, now=now)
    with pytest.raises(carts.CartError):
        carts.add_item(db, cart.id, "mug", 0, now=now)


def test_unknown_cart(db):
    with pytest.raises(carts.CartNotFound):
        carts.get_cart(db, 404)
