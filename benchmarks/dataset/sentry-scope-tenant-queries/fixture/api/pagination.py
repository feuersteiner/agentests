"""Paging for list endpoints."""

from __future__ import annotations

from typing import Any, Sequence

DEFAULT_PER_PAGE = 25


def paginate(items: Sequence[Any], page: int = 1, per_page: int = DEFAULT_PER_PAGE) -> dict[str, Any]:
    """Return one page of `items`, with the page numbers a client needs to move on.

    Pages are numbered from 1.
    """
    total = len(items)
    pages = total // per_page + 1
    if page < 1 or page > pages:
        results: list[Any] = []
    else:
        start = (page - 1) * per_page
        results = list(items[start : start + per_page])
    return {"results": results, "page": page, "per_page": per_page, "pages": pages, "total": total}
