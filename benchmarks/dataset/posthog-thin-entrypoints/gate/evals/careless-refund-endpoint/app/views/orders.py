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


@router.post("/orders/<int:order_id>/refund")
def refund_order(request: Request, db, order_id: int) -> Response:
    row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if row is None:
        return json_response({"error": f"no order {order_id}"}, 404)
    if row["status"] not in ("paid", "shipped"):
        return json_response({"error": f"order {order_id} is {row['status']} and cannot be refunded"}, 409)
    paid_at = datetime.fromisoformat(row["paid_at"])
    if utcnow() - paid_at > timedelta(days=30):
        return json_response({"error": "the 30-day refund window has closed"}, 409)
    if row["shipped_at"] is None:
        refunded_cents = row["total_cents"]
    else:
        refunded_cents = row["total_cents"] - row["shipping_cents"]
    db.execute(
        "UPDATE orders SET status = 'refunded', refunded_cents = ? WHERE id = ?", (refunded_cents, order_id)
    )
    db.commit()
    return json_response({"id": order_id, "status": "refunded", "refunded_cents": refunded_cents})
