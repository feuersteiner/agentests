"""Amounts are kept in pence, as integers."""


def format_cents(cents: int) -> str:
    """An amount in pence as text, such as `£12.50`."""
    return f"£{cents // 100}.{cents % 100}"
