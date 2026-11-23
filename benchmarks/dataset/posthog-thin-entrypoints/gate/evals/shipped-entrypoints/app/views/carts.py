"""The HTTP endpoints for carts."""

from app.clock import utcnow
from app.http import Request, Response, Router, json_response
from app.logic import carts

router = Router()


@router.post("/carts")
def open_cart(request: Request, db) -> Response:
    data = request.json or {}
    if "customer_id" not in data:
        return json_response({"error": "customer_id is required"}, 400)
    try:
        cart = carts.open_cart(db, customer_id=data["customer_id"], now=utcnow())
    except carts.CartError as error:
        return json_response({"error": str(error)}, 400)
    return json_response(cart.to_dict(), 201)


@router.get("/carts/<int:cart_id>")
def show_cart(request: Request, db, cart_id: int) -> Response:
    try:
        cart = carts.get_cart(db, cart_id)
    except carts.CartNotFound as error:
        return json_response({"error": str(error)}, 404)
    return json_response(cart.to_dict())


@router.post("/carts/<int:cart_id>/items")
def add_item(request: Request, db, cart_id: int) -> Response:
    data = request.json or {}
    if "product" not in data or "quantity" not in data:
        return json_response({"error": "product and quantity are required"}, 400)
    try:
        cart = carts.add_item(db, cart_id, product=data["product"], quantity=data["quantity"], now=utcnow())
    except carts.CartNotFound as error:
        return json_response({"error": str(error)}, 404)
    except carts.CartError as error:
        return json_response({"error": str(error)}, 400)
    return json_response(cart.to_dict())
