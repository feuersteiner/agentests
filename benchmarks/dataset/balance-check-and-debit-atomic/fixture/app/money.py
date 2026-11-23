"""Amounts of money, kept as whole pence and shown in pounds."""


def format_cents(cents: int) -> str:
    """Show an amount in pence as pounds, such as 1205 as "£12.05"."""
    return f"£{cents // 100}.{cents % 100:02d}"


def parse_amount(text: str) -> int:
    """Read an amount typed in pounds, such as "12.05" or "12", as pence."""
    pounds, _, pence = text.strip().partition(".")
    return int(pounds) * 100 + int(pence or 0)
