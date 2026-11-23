"""Parse the dates found in CSV exports."""

from datetime import datetime


def parse_date(text):
    """Return the `date` that `text` holds.

    Now accepts any ISO 8601 date or date-time, not just YYYY-MM-DD. Raises
    ValueError for any other text; the CLI reports it with the row number.
    """
    # Exported cells often carry spaces around the value.
    return datetime.fromisoformat(text.strip()).date()
