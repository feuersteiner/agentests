"""Tessera Tiles: the public product catalogue API."""

from __future__ import annotations

from app.models import products_page
from app.web import Request, Response, json

PAGE_SIZE = 24


def list_products(request: Request) -> Response:
    """One page of products, with links to the neighbouring pages for API clients."""
    page = max(int(request.args.get("page", "1")), 1)
    items, total = products_page(page, PAGE_SIZE)
    base_url = request.host_url.rstrip("/") + request.path
    last_page = max((total + PAGE_SIZE - 1) // PAGE_SIZE, 1)
    return json(
        {
            "items": [item.to_dict() for item in items],
            "page": page,
            "next": f"{base_url}?page={page + 1}" if page < last_page else None,
            "previous": f"{base_url}?page={page - 1}" if page > 1 else None,
        }
    )
