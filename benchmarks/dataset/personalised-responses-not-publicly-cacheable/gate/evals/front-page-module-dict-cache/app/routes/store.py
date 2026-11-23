"""The storefront under /store: the front page and the product pages."""

from __future__ import annotations

import time
from html import escape

from app import catalog, db, i18n
from app.web import App, Request, Response

FRONT_PAGE_SECONDS = 30
_FRONT_PAGE_CACHE: dict[str, tuple[float, str]] = {}


def register(app: App) -> None:
    app.route("/store")(front_page)
    app.route("/store/products/<slug>")(product_page)


def front_page(request: Request) -> Response:
    """The front page is rebuilt at most every 30 seconds per language, to survive the sale."""
    locale = i18n.locale_from(request)
    cached = _FRONT_PAGE_CACHE.get(locale)
    if cached is not None and cached[0] > time.monotonic():
        return Response(cached[1])
    body = _section(i18n.t(locale, "featured"), catalog.featured()[:4], locale)
    body += _section(i18n.t(locale, "bestsellers"), catalog.bestsellers(), locale)
    if request.user is not None:
        body += _section(i18n.t(locale, "recommended"), catalog.recommended_for(request.user), locale)
    html = _page(i18n.t(locale, "store_title"), body, locale)
    _FRONT_PAGE_CACHE[locale] = (time.monotonic() + FRONT_PAGE_SECONDS, html)
    return Response(html)


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

