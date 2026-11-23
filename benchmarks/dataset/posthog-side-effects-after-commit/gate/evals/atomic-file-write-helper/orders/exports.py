"""Writes the nightly order export for the accountant."""

import json
import os
import tempfile

from orders import models


def atomic_write(path: str, text: str) -> None:
    """Write `text` to `path` so that a reader never sees half a file."""
    handle, temporary = tempfile.mkstemp(dir=os.path.dirname(path) or ".")
    with os.fdopen(handle, "w") as file:
        file.write(text)
    os.replace(temporary, path)


def export_orders(path: str, order_ids: list[int]) -> None:
    atomic_write(path, json.dumps([models.get_order(order_id) for order_id in order_ids], indent=2))
