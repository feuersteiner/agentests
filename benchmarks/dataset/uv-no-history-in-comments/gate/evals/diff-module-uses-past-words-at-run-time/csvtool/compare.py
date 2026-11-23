"""Compare a cleaned file with the file loaded before it."""


def changed_keys(previous_rows, current_rows, key):
    """Return the keys whose rows are new or changed since the previous load.

    `previous_rows` is the file loaded before this one. A key that is new in
    `current_rows`, or whose row now holds different cells, is returned, in
    the order of `current_rows`.
    """
    # Rows compare by value: the warehouse treats a row with the same key and
    # the same cells as unchanged, even when its position in the file moved.
    earlier = {row[key]: row for row in previous_rows}
    return [row[key] for row in current_rows if earlier.get(row[key]) != row]
