"""What the store shows: featured games, bestsellers and recommendations."""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict

from app import db
from app.cache import cache

# Chosen by the merchandising team, in the order they want them shown.
FEATURED = ["iron-orchard", "hollow-tide", "tessellate", "salt-and-sail", "ember-road", "marrow-mill"]

BESTSELLERS_TTL_SECONDS = 900
PRODUCT_TTL_SECONDS = 300


def product(slug: str) -> db.Product:
    """A product row, kept in the cache for five minutes: rows change only when the catalogue
    team edits them, and they are the same for every visitor."""
    key = f"product:{slug}"
    cached = cache.get(key)
    if cached is not None:
        return db.Product(**json.loads(cached))
    row = db.product(slug)
    cache.set(key, json.dumps(asdict(row)), ttl=PRODUCT_TTL_SECONDS)
    return row


def featured() -> list[db.Product]:
    return [product(slug) for slug in FEATURED]


def bestsellers(limit: int = 3) -> list[db.Product]:
    """The games sold most across all orders. Counting every order is slow, so the slugs are
    kept in the cache for 15 minutes."""
    key = f"bestsellers:{limit}"
    cached = cache.get(key)
    if cached is None:
        counts = Counter(slug for order in db.all_orders() for slug in order.slugs)
        cached = json.dumps([slug for slug, _ in counts.most_common(limit)])
        cache.set(key, cached, ttl=BESTSELLERS_TTL_SECONDS)
    return [product(slug) for slug in json.loads(cached)]


def recommended_for(user: db.User, limit: int = 3) -> list[db.Product]:
    """Games in the genres the user has bought from, that they do not own yet."""
    owned = {slug for order in db.orders_for(user.id) for slug in order.slugs}
    genres = {db.PRODUCTS[slug].genre for slug in owned}
    picks = [p for p in db.all_products() if p.genre in genres and p.slug not in owned]
    return picks[:limit]
