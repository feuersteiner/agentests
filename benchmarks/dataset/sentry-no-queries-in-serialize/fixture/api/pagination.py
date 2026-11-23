"""Cursor pagination for list endpoints."""

from __future__ import annotations

from typing import Any

DEFAULT_LIMIT = 25


def paginate(items: list[Any], cursor: int = 0, limit: int = DEFAULT_LIMIT) -> dict[str, Any]:
    """One page of `items` starting at offset `cursor`, and the cursor of the next page or None."""
    page = items[cursor : cursor + limit]
    next_cursor = cursor + limit if cursor + limit <= len(items) else None
    return {"results": page, "next": next_cursor}
