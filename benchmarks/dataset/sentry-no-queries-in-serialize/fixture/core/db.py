"""A small in-memory object layer that stands in for Django's ORM and the database behind it."""

from __future__ import annotations

from typing import Any, ClassVar, Iterable, Iterator


class DoesNotExist(LookupError):
    """No row matches the query."""


class MultipleObjectsReturned(LookupError):
    """More than one row matches a query that expects one."""


def _matches(row: Any, lookups: dict[str, Any]) -> bool:
    for key, expected in lookups.items():
        field, _, operator = key.partition("__")
        value = getattr(row, field)
        if operator == "in":
            if value not in expected:
                return False
        elif operator == "":
            if value != expected:
                return False
        else:
            raise ValueError(f"Unsupported lookup: {key}")
    return True


class QuerySet:
    """A filtered, ordered view of a model's rows."""

    def __init__(self, model: type[Model], rows: list[Any]):
        self.model = model
        self._rows = rows

    def __iter__(self) -> Iterator[Any]:
        return iter(self._rows)

    def __len__(self) -> int:
        return len(self._rows)

    def __getitem__(self, index: Any) -> Any:
        return self._rows[index]

    def filter(self, **lookups: Any) -> QuerySet:
        return QuerySet(self.model, [row for row in self._rows if _matches(row, lookups)])

    def exclude(self, **lookups: Any) -> QuerySet:
        return QuerySet(self.model, [row for row in self._rows if not _matches(row, lookups)])

    def get(self, **lookups: Any) -> Any:
        rows = self.filter(**lookups)._rows
        if not rows:
            raise self.model.DoesNotExist(f"{self.model.__name__} matching query does not exist")
        if len(rows) > 1:
            raise MultipleObjectsReturned(f"{len(rows)} {self.model.__name__} rows match")
        return rows[0]

    def first(self) -> Any | None:
        return self._rows[0] if self._rows else None

    def exists(self) -> bool:
        return bool(self._rows)

    def count(self) -> int:
        return len(self._rows)

    def order_by(self, *fields: str) -> QuerySet:
        rows = list(self._rows)
        for field in reversed(fields):
            name = field.lstrip("-")
            rows.sort(key=lambda row: getattr(row, name), reverse=field.startswith("-"))
        return QuerySet(self.model, rows)

    def values_list(self, *fields: str, flat: bool = False) -> list[Any]:
        if flat:
            (field,) = fields
            return [getattr(row, field) for row in self._rows]
        return [tuple(getattr(row, field) for field in fields) for row in self._rows]

    def in_bulk(self, id_list: Iterable[int]) -> dict[int, Any]:
        ids = set(id_list)
        return {row.id: row for row in self._rows if row.id in ids}


class Manager:
    """The `objects` attribute of a model."""

    def __init__(self, model: type[Model]):
        self.model = model

    def all(self) -> QuerySet:
        return QuerySet(self.model, list(self.model._rows))

    def filter(self, **lookups: Any) -> QuerySet:
        return self.all().filter(**lookups)

    def exclude(self, **lookups: Any) -> QuerySet:
        return self.all().exclude(**lookups)

    def get(self, **lookups: Any) -> Any:
        return self.all().get(**lookups)

    def in_bulk(self, id_list: Iterable[int]) -> dict[int, Any]:
        return self.all().in_bulk(id_list)

    def create(self, **fields: Any) -> Any:
        row = self.model(**fields)
        row.id = self.model._next_id
        self.model._next_id += 1
        self.model._rows.append(row)
        return row


class ForeignKey:
    """A relation to one row of another model, read from the `<name>_id` field: `project.team`."""

    def __init__(self, model_name: str):
        self.model_name = model_name

    def __set_name__(self, owner: type, name: str) -> None:
        self.column = f"{name}_id"

    def __get__(self, instance: Any, owner: type) -> Any:
        if instance is None:
            return self
        model = Model.named(self.model_name)
        return model.objects.get(id=getattr(instance, self.column))


class ReverseSet:
    """The rows of another model that point at this one: `project.release_set`."""

    def __init__(self, model_name: str, column: str):
        self.model_name = model_name
        self.column = column

    def __get__(self, instance: Any, owner: type) -> Any:
        if instance is None:
            return self
        return Model.named(self.model_name).objects.filter(**{self.column: instance.id})


class Model:
    """Base class of every model. Subclasses are dataclasses whose `id` is set on create."""

    objects: ClassVar[Manager]
    DoesNotExist: ClassVar[type[DoesNotExist]]
    _rows: ClassVar[list[Any]]
    _next_id: ClassVar[int]
    _registry: ClassVar[dict[str, type[Model]]] = {}

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        cls._rows = []
        cls._next_id = 1
        cls.objects = Manager(cls)
        cls.DoesNotExist = type("DoesNotExist", (DoesNotExist,), {})
        Model._registry[cls.__name__] = cls

    @staticmethod
    def named(name: str) -> type[Model]:
        return Model._registry[name]

    def __eq__(self, other: object) -> bool:
        return type(self) is type(other) and self.id == other.id  # type: ignore[attr-defined]

    def __hash__(self) -> int:
        return hash((type(self).__name__, self.id))  # type: ignore[attr-defined]

    def save(self) -> None:
        """Rows are stored by reference, so there is nothing to write."""


def reset() -> None:
    """Empty every table. Used between tests."""
    for model in Model._registry.values():
        model._rows.clear()
        model._next_id = 1
