"""Customers and products, and the in-memory stores that hold them."""

from __future__ import annotations

from dataclasses import dataclass

PLANS = ("free", "plus", "family")


@dataclass
class User:
    id: int
    email: str
    plan: str  # one of PLANS


@dataclass
class Product:
    sku: str
    name: str
    price_cents: int


USERS: dict[int, User] = {}
PRODUCTS: dict[str, Product] = {}


def format_cents(cents: int) -> str:
    """Formats an amount in pence as pounds, such as 1205 as "£12.05"."""
    return f"£{cents // 100}.{cents % 100:02d}"
