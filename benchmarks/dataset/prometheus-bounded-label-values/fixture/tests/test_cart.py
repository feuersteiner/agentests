from app.cart import Cart, CartStore
from app.models import PRODUCTS


def test_add_and_count():
    cart = Cart(1)
    cart.add("EGG-6", 2)
    cart.add("LEEK-1")
    assert cart.items == {"EGG-6": 2, "LEEK-1": 1}
    assert cart.item_count() == 3


def test_remove():
    cart = Cart(1)
    cart.add("EGG-6")
    cart.remove("EGG-6")
    assert cart.items == {}


def test_total_cents():
    cart = Cart(1)
    cart.add("EGG-6", 2)
    cart.add("BOX-VEG")
    assert cart.total_cents(PRODUCTS) == 2 * 245 + 1850


def test_store_keeps_one_cart_per_user():
    store = CartStore()
    store.get(1).add("LEEK-1")
    assert store.get(1).items == {"LEEK-1": 1}
    assert store.get(2).items == {}
    store.clear(1)
    assert store.get(1).items == {}
