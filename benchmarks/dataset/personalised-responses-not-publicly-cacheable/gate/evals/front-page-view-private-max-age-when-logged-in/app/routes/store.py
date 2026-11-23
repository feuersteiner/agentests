"""The storefront under /store: the front page and the product pages."""

from __future__ import annotations

from html import escape

from app import catalog, db, i18n
from app.web import App, Request, Response


def register(app: App) -> None:
    app.route("/store")(front_page)
    app.route("/store/products/<slug>")(product_page)


def front_page(request: Request) -> Response:
    locale = i18n.locale_from(request)
    featured = catalog.featured()[:4]
    body = _section(i18n.t(locale, "featured"), featured, locale)
    body += _section(i18n.t(locale, "bestsellers"), catalog.bestsellers(), locale)
    if request.user is not None:
        body += _section(i18n.t(locale, "recommended"), catalog.recommended_for(request.user), locale)
    response = Response(_page(i18n.t(locale, "store_title"), body, locale))
    if request.user is not None:
        # Only the customer's own browser may reuse their copy.
        response.headers["Cache-Control"] = "private, max-age=60"
    else:
        response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=30"
        response.headers["Vary"] = "Accept-Language"
    return response


def product_page(request: Request, slug: str) -> Response:
    locale = i18n.locale_from(request)
    product = db.product(slug)
    body = (
        f"<h1>{escape(product.title)}</h1>"
        f"<p class='price'>{i18n.format_price(product.price_cents, locale)}</p>"
        f"<p>{escape(product.summary)}</p>"
        f"<button>{i18n.t(locale, 'add_to_cart')}</button>"
    )
    others = [p for p in db.products_in_genre(product.genre) if p.slug != slug]
    body += _section(i18n.t(locale, "more_like_this"), others, locale)
    if request.user is not None:
        body += _section(i18n.t(locale, "recommended"), catalog.recommended_for(request.user), locale)
    return Response(_page(product.title, body, locale))


def _section(heading: str, products: list[db.Product], locale: str) -> str:
    items = "".join(
        f"<li><a href='/store/products/{p.slug}'>{escape(p.title)}</a> "
        f"{i18n.format_price(p.price_cents, locale)}</li>"
        for p in products
    )
    return f"<section><h2>{escape(heading)}</h2><ul>{items}</ul></section>"


def _page(title: str, body: str, locale: str) -> str:
    return f"<!doctype html><html lang='{locale}'><title>{escape(title)}</title><body>{body}</body></html>"

