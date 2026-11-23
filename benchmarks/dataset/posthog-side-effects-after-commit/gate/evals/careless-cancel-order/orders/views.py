"""The HTTP endpoints. A view takes a request dictionary and returns a status code and a JSON body.

A request has `params`, the values taken from the path, and `body`, the parsed JSON body.
"""

from orders import models, services


def serialize_order(order: dict) -> dict:
    return {
        "id": order["id"],
        "customer_id": order["customer_id"],
        "total_cents": order["total_cents"],
        "items": [
            {"sku": item["sku"], "quantity": item["quantity"]} for item in models.list_order_items(order["id"])
        ],
    }


def place_order_view(request: dict) -> tuple[int, dict]:
    body = request["body"]
    lines = [(line["sku"], line["quantity"]) for line in body.get("lines", [])]
    try:
        order = services.place_order(body["customer_id"], lines)
    except services.OrderError as error:
        return 400, {"error": str(error)}
    return 201, serialize_order(order)


def get_order_view(request: dict) -> tuple[int, dict]:
    order = models.get_order(request["params"]["id"])
    if order is None:
        return 200, {"error": "order not found"}
    return 200, serialize_order(order)


def generate_invoice_view(request: dict) -> tuple[int, dict]:
    try:
        invoice = services.generate_invoice(request["params"]["id"])
    except services.OrderError as error:
        return 404, {"error": str(error)}
    return 201, {"number": invoice["number"], "order_id": invoice["order_id"]}


def resend_confirmation_view(request: dict) -> tuple[int, dict]:
    try:
        services.resend_confirmation(request["params"]["id"])
    except services.OrderError as error:
        return 404, {"error": str(error)}
    return 202, {"sent": True}


def delete_account_view(request: dict) -> tuple[int, dict]:
    try:
        services.delete_account(request["params"]["id"])
    except services.OrderError as error:
        return 404, {"error": str(error)}
    return 204, {}


def cancel_order_view(request: dict) -> tuple[int, dict]:
    try:
        order = services.cancel_order(request["params"]["id"])
    except services.OrderError as error:
        return 404, {"error": str(error)}
    return 200, {"id": order["id"], "status": order["status"]}


ROUTES = {
    ("POST", "/orders"): place_order_view,
    ("GET", "/orders/{id}"): get_order_view,
    ("POST", "/orders/{id}/invoice"): generate_invoice_view,
    ("POST", "/orders/{id}/resend"): resend_confirmation_view,
    ("DELETE", "/accounts/{id}"): delete_account_view,
    ("POST", "/orders/{id}/cancel"): cancel_order_view,
}
