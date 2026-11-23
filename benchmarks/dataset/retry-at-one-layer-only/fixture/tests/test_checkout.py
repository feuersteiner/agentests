from app.api.checkout import handle_checkout
from app.models import ORDERS
from tests.conftest import INVENTORY, PRICING, price, stock


def test_checkout_places_the_order(transport):
    transport.plan(f"{INVENTORY}/stock/HAM-16", stock(2, 3))
    transport.plan(f"{PRICING}/prices/HAM-16", price(1999))
    status, body = handle_checkout({"lines": [{"sku": "HAM-16", "quantity": 2}]})
    assert status == 201
    assert body == {"order_id": "ord_1", "total": 3998}
    assert ORDERS[0]["total"] == 3998


def test_checkout_out_of_stock(transport):
    transport.plan(f"{INVENTORY}/stock/DRL-18V", stock(1))
    status, body = handle_checkout({"lines": [{"sku": "DRL-18V", "quantity": 2}]})
    assert (status, body) == (409, {"error": "out of stock", "sku": "DRL-18V"})
    assert ORDERS == []


def test_checkout_unknown_product():
    status, body = handle_checkout({"lines": [{"sku": "NAIL-50", "quantity": 1}]})
    assert (status, body) == (404, {"error": "unknown product", "sku": "NAIL-50"})


def test_checkout_empty_cart():
    assert handle_checkout({"lines": []}) == (400, {"error": "cart is empty"})
