from orders import views


def place(lines) -> tuple[int, dict]:
    return views.place_order_view({"params": {}, "body": {"customer_id": 1, "lines": lines}})


def test_place_order_view_returns_the_order():
    status, body = place([{"sku": "PEA-01", "quantity": 3}])

    assert status == 201
    assert body == {
        "id": 1,
        "customer_id": 1,
        "total_cents": 885,
        "items": [{"sku": "PEA-01", "quantity": 3}],
    }


def test_place_order_view_rejects_an_empty_order():
    status, body = place([])

    assert status == 400
    assert "at least one line" in body["error"]


def test_get_order_view_reads_an_order():
    place([{"sku": "BEAN-07", "quantity": 1}])

    status, body = views.get_order_view({"params": {"id": 1}, "body": {}})

    assert status == 200
    assert body["total_cents"] == 349


def test_delete_account_view_answers_204():
    assert views.delete_account_view({"params": {"id": 1}, "body": {}}) == (204, {})


def test_every_route_has_a_view():
    assert all(callable(view) for view in views.ROUTES.values())
