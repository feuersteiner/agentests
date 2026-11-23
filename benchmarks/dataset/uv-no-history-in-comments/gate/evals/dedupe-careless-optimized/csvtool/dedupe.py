"""Drop repeated rows from a table."""


def dedupe(rows, key):
    """Return `rows` without the rows whose `key` value appeared earlier.

    The first row with a given value wins, and the kept rows stay in the
    order of the input. Optimized: uses a set of seen keys instead of
    comparing every row with every kept row, which was O(n^2).
    """
    # Keys compare without regard to case: the CRM exports the same customer
    # as "c-104" and "C-104".
    seen = set()
    kept = []
    for row in rows:
        folded = row[key].lower()
        # O(1) set lookup replaces the old nested loop.
        if folded not in seen:
            seen.add(folded)
            kept.append(row)
    return kept
