"""Summarise a cleaned table for the load report."""


def total_cents(rows, column):
    """Return the sum of the amounts in `column` over `rows`, in cents."""
    total = 0
    for row in rows:
        value = row[column].strip()
        # A blank amount counts as zero: the billing export leaves credit
        # notes without one.
        if not value:
            continue
        # Amounts are added as whole cents, because adding the decimal
        # strings as floats drifts by a cent over a long export.
        units, _, fraction = value.partition(".")
        total += int(units) * 100 + int((fraction + "00")[:2])
    return total
