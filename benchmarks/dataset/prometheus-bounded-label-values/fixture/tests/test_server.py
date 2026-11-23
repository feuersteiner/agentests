from app.http import Request
from app.metrics import CHECKOUTS, HTTP_REQUESTS
from app.billing import PaymentDeclined
from app.server import handle


def request(method, path, user=1, body=None):
    headers = {"X-User-Id": str(user)} if user else {}
    return handle(Request(method, path, headers, body))


def test_get_product():
    response = request("GET", "/products/LEEK-1")
    assert response.status == 200
    assert response.body == {"sku": "LEEK-1", "name": "Leek", "price": "£0.60"}


def test_cart_needs_a_user():
    assert request("GET", "/cart", user=None).status == 401


def test_add_items_to_cart():
    response = request("POST", "/cart/items", body={"sku": "EGG-6", "quantity": 2})
    assert response.status == 201
    assert response.body["item_count"] == 2
    assert response.body["total"] == "£4.90"


def test_add_unknown_product():
    assert request("POST", "/cart/items", body={"sku": "NOPE"}).status == 404


def test_remove_item():
    request("POST", "/cart/items", body={"sku": "EGG-6"})
    assert request("DELETE", "/cart/items/EGG-6").status == 204
    assert request("GET", "/cart").body["items"] == []


def test_checkout_charges_the_cart(shop):
    request("POST", "/cart/items", body={"sku": "BOX-VEG"})
    response = request("POST", "/checkout", body={"card_token": "tok_visa"})
    assert response.status == 200
    assert response.body == {"payment_id": "pay_1", "total": "£18.50"}
    assert shop.charges == [("tok_visa", 1850)]
    assert CHECKOUTS.labels(plan="plus").value == 1
    assert request("GET", "/cart").body["items"] == []


def test_declined_checkout_keeps_the_cart(shop):
    shop.decline = PaymentDeclined("card_declined", "Do not honour.")
    request("POST", "/cart/items", body={"sku": "LEEK-1"})
    response = request("POST", "/checkout", body={"card_token": "tok_bad"})
    assert response.status == 402
    assert response.body == {"error": "payment declined", "code": "card_declined"}
    assert request("GET", "/cart").body["item_count"] == 1


def test_requests_are_counted_by_route_template():
    request("GET", "/products/LEEK-1")
    request("GET", "/products/EGG-6")
    request("GET", "/no/such/page")
    assert HTTP_REQUESTS.labels(route="/products/<sku>", method="GET", status_class="2xx").value == 2
    assert HTTP_REQUESTS.labels(route="unmatched", method="GET", status_class="4xx").value == 1


def test_metrics_endpoint_renders_text():
    request("GET", "/products/LEEK-1")
    response = request("GET", "/metrics", user=None)
    assert response.status == 200
    assert 'marrow_http_requests_total{route="/products/<sku>",method="GET",status_class="2xx"} 1.0' in response.body
