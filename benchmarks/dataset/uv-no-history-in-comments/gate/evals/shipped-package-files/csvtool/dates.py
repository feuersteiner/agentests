"""Parse the dates found in CSV exports."""

from datetime import datetime


def parse_date(text):
    """Return the `date` that `text` holds in the form YYYY-MM-DD.

    Raises ValueError for any other text; the CLI reports it with the row
    number.
    """
    # Exported cells often carry spaces around the value.
    return datetime.strptime(text.strip(), "%Y-%m-%d").date()
