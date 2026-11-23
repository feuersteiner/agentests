"""Builds the SQL of each strategy. Nothing here touches a database."""

from minietl.models import Model

STRATEGIES = ("append", "delete+insert")


def create_target(model: Model) -> str:
    columns = ", ".join(model.columns)
    return f"CREATE TABLE IF NOT EXISTS {model.name} ({columns})"


def high_water_mark(model: Model) -> str:
    return f"SELECT COALESCE(MAX({model.cursor}), '') FROM {model.name}"


def insert_new(model: Model) -> str:
    columns = ", ".join(model.columns)
    return (
        f"INSERT INTO {model.name} ({columns}) "
        f"SELECT {columns} FROM {model.source} "
        f"WHERE {model.cursor} > :since"
    )


def delete_changed(model: Model) -> str:
    return (
        f"DELETE FROM {model.name} WHERE {model.key} IN "
        f"(SELECT {model.key} FROM {model.source} WHERE {model.cursor} > :since)"
    )


def statements(model: Model, strategy: str) -> list[str]:
    """The statements of one incremental run, in order. Each takes the parameter :since."""
    if strategy == "append":
        return [insert_new(model)]
    if strategy == "delete+insert":
        return [delete_changed(model), insert_new(model)]
    raise ValueError(f"unknown strategy: {strategy}")
