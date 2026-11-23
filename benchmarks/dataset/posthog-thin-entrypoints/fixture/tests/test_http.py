from app.http import Request
from app.server import router


def test_create_then_show_order(db):
    body = {"customer_id": 1, "items": [{"product": "mug", "quantity": 2, "unit_price_cents": 1200}]}
    created = router.dispatch(Request("POST", "/orders", json=body), db)
    shown = router.dispatch(Request("GET", f"/orders/{created.body['id']}"), db)
    assert created.status == 201
    assert (shown.status, shown.body["total_cents"]) == (200, 2900)


def test_create_order_needs_items(db):
    response = router.dispatch(Request("POST", "/orders", json={"customer_id": 1}), db)
    assert (response.status, response.body) == (400, {"error": "customer_id and items are required"})


def test_show_unknown_order(db):
    response = router.dispatch(Request("GET", "/orders/404"), db)
    assert response.status == 404


def test_add_item_to_cart(db):
    cart = router.dispatch(Request("POST", "/carts", json={"customer_id": 2}), db)
    response = router.dispatch(
        Request("POST", f"/carts/{cart.body['id']}/items", json={"product": "lamp", "quantity": 1}), db
    )
    assert (response.status, response.body["items"]) == (200, [{"product": "lamp", "quantity": 1}])
