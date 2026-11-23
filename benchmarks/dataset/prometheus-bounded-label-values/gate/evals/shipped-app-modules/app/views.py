"""Request handlers. Each takes the request and the route's named parts and returns a Response."""

from __future__ import annotations

import telemetry
from app import billing
from app.cart import CARTS, Cart
from app.http import BadRequest, NotFound, Request, Response, Unauthorized
from app.metrics import CHECKOUT_VALUE, CHECKOUTS
from app.models import PRODUCTS, Product, User, format_cents


def require_user(request: Request) -> User:
    if request.user is None:
        raise Unauthorized("sign in first")
    return request.user


def serialize_product(product: Product) -> dict:
    return {"sku": product.sku, "name": product.name, "price": format_cents(product.price_cents)}


def serialize_cart(cart: Cart) -> dict:
    return {
        "items": [{"sku": sku, "quantity": quantity} for sku, quantity in cart.items.items()],
        "item_count": cart.item_count(),
        "total": format_cents(cart.total_cents(PRODUCTS)),
    }


def get_product(request: Request, sku: str) -> Response:
    return Response(200, serialize_product(PRODUCTS[sku]))


def get_cart(request: Request) -> Response:
    user = require_user(request)
    return Response(200, serialize_cart(CARTS.get(user.id)))


def add_item(request: Request) -> Response:
    user = require_user(request)
    body = request.body or {}
    sku, quantity = body.get("sku"), body.get("quantity", 1)
    if sku not in PRODUCTS:
        raise NotFound("unknown product")
    if not isinstance(quantity, int) or quantity < 1:
        raise BadRequest("quantity must be a whole number of at least 1")
    cart = CARTS.get(user.id)
    cart.add(sku, quantity)
    return Response(201, serialize_cart(cart))


def remove_item(request: Request, sku: str) -> Response:
    user = require_user(request)
    CARTS.get(user.id).remove(sku)
    return Response(204)


def checkout(request: Request) -> Response:
    user = require_user(request)
    card_token = (request.body or {}).get("card_token")
    if not card_token:
        raise BadRequest("card_token is required")
    amount_cents = CARTS.get(user.id).total_cents(PRODUCTS)
    try:
        payment = billing.charge(user, card_token, amount_cents)
    except billing.PaymentDeclined as exc:
        return Response(402, {"error": "payment declined", "code": exc.code})
    CARTS.clear(user.id)
    CHECKOUTS.labels(plan=user.plan).inc()
    CHECKOUT_VALUE.observe(amount_cents / 100)
    return Response(200, {"payment_id": payment.id, "total": format_cents(amount_cents)})


def metrics(request: Request) -> Response:
    return Response(200, telemetry.render(), content_type="text/plain; version=0.0.4")
