"""Amounts of money, in pence."""


def split_evenly(total_pence: int, parts: int) -> list[int]:
    """Split an amount into `parts` amounts that differ by at most a penny and add up to it."""
    share, remainder = divmod(total_pence, parts)
    return [share + 1 if index < remainder else share for index in range(parts)]
