from tests.conftest import JONAS, MIRA


def test_account_needs_login(client):
    response = client.get("/account")
    assert response.status == 302
    assert response.headers["Location"] == "/login?next=/account"


def test_account_page(client):
    response = client.get("/account", cookies=MIRA)
    assert "mira@example.com" in response.body
    assert "14 Quay Street, Galway" in response.body


def test_orders_page_lists_the_customers_orders(client):
    body = client.get("/account/orders", cookies=MIRA).body
    positions = [body.index(f"order-{order_id}") for order_id in (101, 103, 105)]
    assert positions == sorted(positions)
    assert "order-102" not in body


def test_checkout_lists_the_cart(client):
    body = client.get("/checkout", cookies=MIRA).body
    assert "Salt and Sail x 2" in body
    assert "Quiet Gears x 1" in body


def test_checkout_with_an_empty_cart(client):
    body = client.get("/checkout", cookies=JONAS).body
    assert "Total: €0.00" in body
