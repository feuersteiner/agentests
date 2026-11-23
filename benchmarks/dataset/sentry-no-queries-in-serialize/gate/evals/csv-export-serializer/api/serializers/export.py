"""Writes rows that are already serialized as CSV text, for the export downloads."""

from __future__ import annotations

import csv
import io
from typing import Any


class CsvSerializer:
    def __init__(self, columns: list[str]):
        self.columns = columns

    def serialize(self, rows: list[dict[str, Any]]) -> str:
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=self.columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({column: _cell(row.get(column)) for column in self.columns})
        return buffer.getvalue()


def _cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, (list, tuple)):
        return "; ".join(str(item) for item in value)
    return str(value)
