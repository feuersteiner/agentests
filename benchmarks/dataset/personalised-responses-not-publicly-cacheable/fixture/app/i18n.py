"""Interface strings and price formats in the store's three languages."""

from __future__ import annotations

from app.web import Request

SUPPORTED = ("en", "de", "fr")
DEFAULT = "en"

STRINGS = {
    "en": {
        "store_title": "Ashgrove Games",
        "featured": "Featured",
        "bestsellers": "Bestsellers",
        "recommended": "Recommended for you",
        "more_like_this": "More like this",
        "add_to_cart": "Add to cart",
    },
    "de": {
        "store_title": "Ashgrove Games",
        "featured": "Empfohlen",
        "bestsellers": "Bestseller",
        "recommended": "Für dich ausgewählt",
        "more_like_this": "Ähnliche Spiele",
        "add_to_cart": "In den Warenkorb",
    },
    "fr": {
        "store_title": "Ashgrove Games",
        "featured": "À la une",
        "bestsellers": "Meilleures ventes",
        "recommended": "Recommandé pour vous",
        "more_like_this": "Dans le même genre",
        "add_to_cart": "Ajouter au panier",
    },
}


def locale_from(request: Request) -> str:
    """The first supported language listed in the Accept-Language header, else English."""
    for part in request.headers.get("Accept-Language", "").split(","):
        language = part.split(";")[0].strip().lower().split("-")[0]
        if language in SUPPORTED:
            return language
    return DEFAULT


def t(locale: str, key: str) -> str:
    return STRINGS[locale][key]


def format_price(cents: int, locale: str) -> str:
    euros, rest = divmod(cents, 100)
    if locale == "en":
        return f"€{euros}.{rest:02d}"
    return f"{euros},{rest:02d} €"
