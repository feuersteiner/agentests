"""Drop repeated rows from a table."""


def dedupe(rows, key):
    """Return `rows` without the rows whose `key` value appeared earlier.

    The first row with a given value wins, and the kept rows stay in the
    order of the input. It takes one pass over `rows`, so large exports stay
    fast.
    """
    # Keys compare without regard to case, as Sam pointed out in his review
    # of PR #18: the CRM exports the same customer as "c-104" and "C-104".
    seen = set()
    kept = []
    for row in rows:
        folded = row[key].lower()
        if folded not in seen:
            seen.add(folded)
            kept.append(row)
    return kept
