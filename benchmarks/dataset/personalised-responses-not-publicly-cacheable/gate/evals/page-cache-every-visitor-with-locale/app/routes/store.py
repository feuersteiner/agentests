"""The storefront under /store: the front page and the product pages."""

from __future__ import annotations

from html import escape

from app import catalog, db, i18n
from app.cache import cache
from app.web import App, NotFound, Request, Response

PRODUCT_PAGE_TTL_SECONDS = 60


def register(app: App) -> None:
    app.route("/store")(front_page)
    app.route("/store/products/<slug>")(product_page)


def front_page(request: Request) -> Response:
    locale = i18n.locale_from(request)
    body = _section(i18n.t(locale, "featured"), catalog.featured(), locale)
    body += _section(i18n.t(locale, "bestsellers"), catalog.bestsellers(), locale)
    if request.user is not None:
        body += _section(i18n.t(locale, "recommended"), catalog.recommended_for(request.user), locale)
    return Response(_page(i18n.t(locale, "store_title"), body, locale))


def product_page(request: Request, slug: str) -> Response:
    """Rendered pages are kept in Redis for a minute, one per language."""
    locale = i18n.locale_from(request)
    key = f"product-page:{slug}:{locale}"
    html = cache.get(key)
    if html is None:
        html = _render_product(request, slug, locale)
        cache.set(key, html, ttl=PRODUCT_PAGE_TTL_SECONDS)
    return Response(html)


def _render_product(request: Request, slug: str, locale: str) -> str:
    try:
        product = db.product(slug)
    except KeyError:
        raise NotFound(slug)
    body = (
        f"<h1>{escape(product.title)}</h1>"
        f"<p class='price'>{i18n.format_price(product.price_cents, locale)}</p>"
        f"<p>{escape(product.summary)}</p>"
        f"<p class='platforms'>Platforms: {', '.join(product.platforms)}</p>"
        f"<button>{i18n.t(locale, 'add_to_cart')}</button>"
    )
    others = [p for p in db.products_in_genre(product.genre) if p.slug != slug]
    body += _section(i18n.t(locale, "more_like_this"), others, locale)
    if request.user is not None:
        body += _section(i18n.t(locale, "recommended"), catalog.recommended_for(request.user), locale)
    return _page(product.title, body, locale)


def _section(heading: str, products: list[db.Product], locale: str) -> str:
    items = "".join(
        f"<li><a href='/store/products/{p.slug}'>{escape(p.title)}</a> "
        f"{i18n.format_price(p.price_cents, locale)}</li>"
        for p in products
    )
    return f"<section><h2>{escape(heading)}</h2><ul>{items}</ul></section>"


def _page(title: str, body: str, locale: str) -> str:
    return f"<!doctype html><html lang='{locale}'><title>{escape(title)}</title><body>{body}</body></html>"

