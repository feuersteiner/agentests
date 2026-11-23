"""Stands in for the store's Postgres database. Each function is one query; `queries` counts them."""

from __future__ import annotations

from dataclasses import dataclass

queries = 0


@dataclass(frozen=True)
class Product:
    slug: str
    title: str
    genre: str
    price_cents: int
    summary: str


@dataclass(frozen=True)
class User:
    id: int
    name: str
    email: str
    billing_address: str


@dataclass(frozen=True)
class Order:
    id: int
    user_id: int
    placed_on: str
    slugs: tuple[str, ...]


@dataclass(frozen=True)
class CartLine:
    slug: str
    quantity: int


PRODUCTS = {
    p.slug: p
    for p in [
        Product("hollow-tide", "Hollow Tide", "adventure", 1999, "Sail a drowned coast at night."),
        Product("ember-road", "Ember Road", "adventure", 2499, "A caravan crosses a burning steppe."),
        Product("lantern-keep", "Lantern Keep", "adventure", 1499, "Keep the lights on until dawn."),
        Product("tessellate", "Tessellate", "puzzle", 999, "Tile puzzles that fold in on themselves."),
        Product("quiet-gears", "Quiet Gears", "puzzle", 1299, "Repair clocks that run backwards."),
        Product("marrow-mill", "Marrow Mill", "puzzle", 799, "Route water through a crumbling mill."),
        Product("iron-orchard", "Iron Orchard", "strategy", 2999, "Grow a city from scrap and seeds."),
        Product("salt-and-sail", "Salt and Sail", "strategy", 1999, "Trade along a frozen sea."),
    ]
}

USERS = {
    1: User(1, "Mira Okafor", "mira@example.com", "14 Quay Street, Galway"),
    2: User(2, "Jonas Weber", "jonas@example.com", "Lindenallee 3, Leipzig"),
}

SESSIONS = {"tok-mira-7f3a": 1, "tok-jonas-21c9": 2}

ORDERS = [
    Order(101, 1, "2026-03-02", ("hollow-tide",)),
    Order(102, 2, "2026-04-18", ("tessellate", "quiet-gears")),
    Order(103, 1, "2026-06-11", ("tessellate",)),
    Order(104, 2, "2026-08-30", ("iron-orchard",)),
    Order(105, 1, "2026-09-21", ("iron-orchard", "ember-road")),
]

CARTS = {1: [CartLine("salt-and-sail", 2), CartLine("quiet-gears", 1)], 2: []}


def _query() -> None:
    global queries
    queries += 1


def product(slug: str) -> Product:
    _query()
    return PRODUCTS[slug]


def all_products() -> list[Product]:
    _query()
    return list(PRODUCTS.values())


def products_in_genre(genre: str) -> list[Product]:
    _query()
    return [p for p in PRODUCTS.values() if p.genre == genre]


def user_for_session(token: str) -> User | None:
    _query()
    user_id = SESSIONS.get(token)
    return USERS.get(user_id) if user_id is not None else None


def orders_for(user_id: int) -> list[Order]:
    _query()
    return [o for o in ORDERS if o.user_id == user_id]


def all_orders() -> list[Order]:
    _query()
    return list(ORDERS)


def cart_for(user_id: int) -> list[CartLine]:
    _query()
    return list(CARTS.get(user_id, []))
