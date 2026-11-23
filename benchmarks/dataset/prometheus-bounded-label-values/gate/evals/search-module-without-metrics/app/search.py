"""Product search: ranks products by how many query words their names share."""

from __future__ import annotations

import re
from collections import Counter

from app.models import Product

WORD = re.compile(r"[a-z0-9]+")


def words(text: str) -> list[str]:
    return WORD.findall(text.lower())


def search(query: str, products: dict[str, Product], limit: int = 10) -> list[Product]:
    wanted = Counter(words(query))
    scored = []
    for product in products.values():
        have = Counter(words(product.name))
        score = sum(min(count, have[word]) for word, count in wanted.items())
        if score:
            scored.append((-score, product.name, product))
    return [product for _, _, product in sorted(scored)[:limit]]
