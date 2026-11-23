"""Pages for one customer: their account, their orders and checkout."""

from __future__ import annotations

from html import escape

from app import db, i18n
from app.web import App, Request, Response


def register(app: App) -> None:
    app.route("/account")(account_page)
    app.route("/account/orders")(orders_page)
    app.route("/checkout")(checkout_page)


def _login_redirect(request: Request) -> Response:
    return Response("", status=302, headers={"Location": f"/login?next={request.path}"})


def account_page(request: Request) -> Response:
    user = request.user
    if user is None:
        return _login_redirect(request)
    body = (
        f"<h1>{escape(user.name)}</h1>"
        f"<p>{escape(user.email)}</p>"
        f"<p>Billing address: {escape(user.billing_address)}</p>"
    )
    return Response(f"<!doctype html><html><body>{body}</body></html>")


def orders_page(request: Request) -> Response:
    user = request.user
    if user is None:
        return _login_redirect(request)
    rows = "".join(
        f"<li id='order-{order.id}'>{order.placed_on}: "
        f"{escape(', '.join(db.product(slug).title for slug in order.slugs))}</li>"
        for order in reversed(db.orders_for(user.id))
    )
    return Response(f"<!doctype html><html><body><h1>Your orders</h1><ol>{rows}</ol></body></html>")


def checkout_page(request: Request) -> Response:
    user = request.user
    if user is None:
        return _login_redirect(request)
    locale = i18n.locale_from(request)
    lines = db.cart_for(user.id)
    rows = ""
    total = 0
    for line in lines:
        product = db.product(line.slug)
        rows += f"<li>{escape(product.title)} x {line.quantity}</li>"
        total += product.price_cents
    body = (
        f"<h1>Checkout</h1><ul>{rows}</ul>"
        f"<p class='total'>Total: {i18n.format_price(total, locale)}</p>"
        f"<p>Billing address: {escape(user.billing_address)}</p>"
    )
    return Response(f"<!doctype html><html><body>{body}</body></html>")
