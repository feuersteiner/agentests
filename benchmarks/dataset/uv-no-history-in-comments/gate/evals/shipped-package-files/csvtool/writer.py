"""Write rows back to a CSV file."""

import csv


def write_rows(path, header, rows):
    """Write `header` and `rows` to the CSV file at `path`."""
    with open(path, "w", encoding="utf-8", newline="") as handle:
        # The warehouse loader accepts LF line endings only.
        writer = csv.DictWriter(handle, fieldnames=header, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
