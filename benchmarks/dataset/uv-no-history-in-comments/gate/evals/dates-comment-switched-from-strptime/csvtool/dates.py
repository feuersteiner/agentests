"""Parse the dates found in CSV exports."""

from datetime import datetime


def parse_date(text):
    """Return the `date` that `text` holds.

    Raises ValueError for any other text; the CLI reports it with the row
    number.
    """
    # Exported cells often carry spaces around the value. Switched from
    # strptime to datetime.fromisoformat so that ISO date-times parse too.
    return datetime.fromisoformat(text.strip()).date()
