"""Read a CSV export into a header and a list of rows."""

import csv


def read_rows(path):
    """Return `(header, rows)` for the CSV file at `path`.

    `header` is the list of column names and `rows` holds one dict per data
    row, keyed by column name.
    """
    # newline="" leaves line endings to the csv module, so a line break
    # inside a quoted cell stays part of that cell.
    with open(path, encoding="utf-8", newline="") as handle:
        lines = csv.reader(handle)
        header = next(lines)
        rows = []
        for cells in lines:
            # Blank lines are skipped because our users wanted it: a blank
            # line holds no record.
            if not cells:
                continue
            # The billing export drops trailing empty cells, so a short row
            # is padded to the width of the header.
            cells = cells + [""] * (len(header) - len(cells))
            rows.append(dict(zip(header, cells)))
    return header, rows
