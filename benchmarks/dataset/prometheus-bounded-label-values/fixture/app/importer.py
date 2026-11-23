"""Imports the growers' product catalogue, a CSV file, into the product store."""

from __future__ import annotations

import csv
import io
import logging
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation

from app.metrics import IMPORT_ROWS
from app.models import Product

log = logging.getLogger(__name__)

REQUIRED_COLUMNS = ("sku", "name", "price")
ROW_ERROR_CODES = ("missing_field", "bad_price", "duplicate_sku")


class RowError(Exception):
    """A row the importer cannot use. code is one of ROW_ERROR_CODES."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass
class ImportReport:
    imported: int = 0
    failed: int = 0
    errors: list[str] = field(default_factory=list)


def parse_row(row: dict[str, str], line: int) -> Product:
    for column in REQUIRED_COLUMNS:
        if not (row.get(column) or "").strip():
            raise RowError("missing_field", f"line {line}: {column} is empty")
    try:
        price = Decimal(row["price"].strip())
    except InvalidOperation:
        raise RowError("bad_price", f"line {line}: price {row['price']!r} is not a number") from None
    if price <= 0:
        raise RowError("bad_price", f"line {line}: price {row['price']!r} is not positive")
    return Product(row["sku"].strip(), row["name"].strip(), int(price * 100))


def import_catalogue(text: str, products: dict[str, Product]) -> ImportReport:
    """Adds or updates a product for every usable row and reports the rest."""
    report = ImportReport()
    seen: set[str] = set()
    for line, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            product = parse_row(row, line)
            if product.sku in seen:
                raise RowError("duplicate_sku", f"line {line}: SKU {product.sku} appears twice")
        except RowError as exc:
            report.failed += 1
            report.errors.append(str(exc))
            IMPORT_ROWS.labels(outcome="failed").inc()
            log.warning("catalogue row skipped: %s", exc)
            continue
        seen.add(product.sku)
        products[product.sku] = product
        report.imported += 1
        IMPORT_ROWS.labels(outcome="imported").inc()
    return report
