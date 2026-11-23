"""The morning stock report: uploads every product's stock level as CSV for the buyers."""

from __future__ import annotations

import csv
import io
import time
import urllib.error
import urllib.request

from app.models import CATALOGUE, STOCK_CACHE
from app.queue import job

REPORT_URL = "https://reports.ironbark.example/stock/latest.csv"


def render_csv() -> bytes:
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["sku", "name", "units"])
    for sku, name in CATALOGUE.items():
        writer.writerow([sku, name, STOCK_CACHE.get(sku, "")])
    return out.getvalue().encode()


@job("stock-report")
def upload_stock_report() -> None:
    request = urllib.request.Request(REPORT_URL, data=render_csv(), method="PUT")
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=10):
                return
        except urllib.error.URLError:
            if attempt == 2:
                raise
            time.sleep(15)
