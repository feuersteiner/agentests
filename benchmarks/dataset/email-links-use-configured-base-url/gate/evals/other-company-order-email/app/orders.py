"""Fernway Bakery: placing an order and confirming it by email."""

from __future__ import annotations

import logging

from app import settings
from app.emails import send_email
from app.models import Order, save_order
from app.web import BadRequest, Request, Response, json

log = logging.getLogger(__name__)

HELP_URL = "https://help.fernwaybakery.co.uk/delivery"


def place_order(request: Request) -> Response:
    items = request.json.get("items") or []
    if not items:
        raise BadRequest("Your basket is empty.")
    order = save_order(Order.from_items(request.user, items))
    log.info("order %s placed via %s from %s", order.id, request.host, request.remote_addr)
    order_link = f"{settings.SITE_URL}/orders/{order.id}"
    send_email(
        to=request.user.email,
        subject=f"Your Fernway order {order.number}",
        text=(
            f"Thanks for your order. We'll bake it fresh for {order.delivery_date:%A %d %B}.\n\n"
            f"See your order: {order_link}\n"
            f"Delivery questions: {HELP_URL}\n"
        ),
    )
    return json({"id": order.id, "number": order.number}, status=201)
