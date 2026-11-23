"""The HTTP endpoints for orders."""

from datetime import datetime, timedelta

from app.clock import utcnow
from app.http import Request, Response, Router, json_response
from app.logic import orders

router = Router()


@router.post("/orders")
def create_order(request: Request, db) -> Response:
    data = request.json or {}
    if "customer_id" not in data or "items" not in data:
        return json_response({"error": "customer_id and items are required"}, 400)
    try:
        order = orders.create_order(db, customer_id=data["customer_id"], items=data["items"], now=utcnow())
    except orders.OrderError as error:
        return json_response({"error": str(error)}, 400)
    return json_response(order.to_dict(), 201)


@router.get("/orders")
def list_orders(request: Request, db) -> Response:
    customer_id = request.query.get("customer_id")
    found = orders.list_orders(db, customer_id=int(customer_id) if customer_id else None)
    return json_response({"orders": [order.to_dict() for order in found]})


@router.get("/orders/<int:order_id>")
def show_order(request: Request, db, order_id: int) -> Response:
    try:
        order = orders.fetch_order(db, order_id)
    except orders.OrderNotFound as error:
        return json_response({"error": str(error)}, 404)
    return json_response(order.to_dict())


@router.post("/orders/<int:order_id>/pay")
def pay_order(request: Request, db, order_id: int) -> Response:
    try:
        order = orders.mark_paid(db, order_id, now=utcnow())
    except orders.OrderNotFound as error:
        return json_response({"error": str(error)}, 404)
    except orders.OrderError as error:
        return json_response({"error": str(error)}, 409)
    return json_response(order.to_dict())


@router.post("/orders/<int:order_id>/ship")
def ship_order(request: Request, db, order_id: int) -> Response:
    try:
        order = orders.mark_shipped(db, order_id, now=utcnow())
    except orders.OrderNotFound as error:
        return json_response({"error": str(error)}, 404)
    except orders.OrderError as error:
        return json_response({"error": str(error)}, 409)
    return json_response(order.to_dict())


def _refundable_cents(order: orders.Order, now: datetime) -> int:
    if order.status not in ("paid", "shipped"):
        raise orders.OrderError(f"order {order.id} is {order.status} and cannot be refunded")
    if now - datetime.fromisoformat(order.paid_at) > timedelta(days=30):
        raise orders.OrderError(f"order {order.id} was paid more than 30 days ago")
    if order.shipped_at is None:
        return order.total_cents
    return order.total_cents - order.shipping_cents


@router.post("/orders/<int:order_id>/refund")
def refund_order(request: Request, db, order_id: int) -> Response:
    try:
        order = orders.fetch_order(db, order_id)
        refunded = orders.record_refund(db, order_id, _refundable_cents(order, utcnow()))
    except orders.OrderNotFound as error:
        return json_response({"error": str(error)}, 404)
    except orders.OrderError as error:
        return json_response({"error": str(error)}, 409)
    return json_response(refunded.to_dict())
