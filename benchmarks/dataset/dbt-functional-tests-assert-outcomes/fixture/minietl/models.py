"""The models: each one is a reporting table and the raw table it loads from."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Model:
    name: str  # the reporting table
    source: str  # the raw table
    key: str  # the column that identifies a row
    columns: tuple[str, ...]  # the columns copied, the key among them
    cursor: str = "updated_at"  # the column that says when a raw row changed


MODELS = {
    "orders": Model(
        name="orders",
        source="raw_orders",
        key="id",
        columns=("id", "status", "amount", "updated_at"),
    ),
    "page_views": Model(
        name="page_views",
        source="raw_page_views",
        key="id",
        columns=("id", "path", "updated_at"),
    ),
}


def get_model(name: str) -> Model:
    try:
        return MODELS[name]
    except KeyError:
        raise ValueError(f"unknown model: {name}") from None
