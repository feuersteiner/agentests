"""Parse the dates found in CSV exports."""

from datetime import datetime


def parse_date(text):
    """Return the `date` that `text` holds as an ISO 8601 date or date-time.

    A date-time such as 2026-03-09T14:30:00 gives its date. Raises ValueError
    for any other text; the CLI reports it with the row number.
    """
    # Exported cells often carry spaces around the value.
    return datetime.fromisoformat(text.strip()).date()
