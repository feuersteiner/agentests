"""Drop repeated rows from a table."""


def dedupe(rows, key):
    """Return `rows` without the rows whose `key` value appeared earlier.

    The first row with a given value wins, and the kept rows stay in the
    order of the input.
    """
    kept = []
    for row in rows:
        duplicate = False
        for earlier in kept:
            # Keys compare without regard to case: the CRM exports the same
            # customer as "c-104" and "C-104".
            if earlier[key].lower() == row[key].lower():
                duplicate = True
                break
        if not duplicate:
            kept.append(row)
    return kept
