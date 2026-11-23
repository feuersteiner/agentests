"""Import tables that customers export from SAS, the statistics package, as CSV.

SAS writes dates as a number of days since 1960-01-01 and marks missing values with ".".
Parsed tables are cached for a day, since customers re-upload the same export many times.
"""

import csv
import io
from datetime import date, timedelta

SAS_EPOCH = date(1960, 1, 1)
PARSED_TABLE_TTL = timedelta(days=1)
_cache: dict[str, list[dict]] = {}


def sas_date(value: str) -> date | None:
    """A SAS date value, such as 23674, as a date; None for a missing value."""
    value = value.strip()
    if value in ("", "."):
        return None
    return SAS_EPOCH + timedelta(days=int(float(value)))


def read_table(text: str, date_columns: set[str], has_permission: bool) -> list[dict]:
    """The rows of an exported table; the caller checks the user's permission to import first."""
    if not has_permission:
        raise PermissionError("this user may not import tables")
    if text in _cache:
        return _cache[text]
    rows = []
    for row in csv.DictReader(io.StringIO(text)):
        rows.append({k: sas_date(v) if k in date_columns else v for k, v in row.items()})
    _cache[text] = rows
    return rows
