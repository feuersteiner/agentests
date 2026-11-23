"""A small in-memory object layer with a Django-style query interface.

Lookups are keyword arguments: `field=value` for equality, `field__iexact=value` for a
case-insensitive match and `field__in=values` for membership.
"""

from __future__ import annotations

from typing import Any, ClassVar, Iterator


class DoesNotExist(LookupError):
    """No row matches the query."""


class MultipleObjectsReturned(LookupError):
    """More than one row matches a query that expects one."""


def _matches(row: Any, lookups: dict[str, Any]) -> bool:
    for key, expected in lookups.items():
        field, _, operator = key.partition("__")
        value = getattr(row, field)
        if operator == "":
            if value != expected:
                return False
        elif operator == "iexact":
            # The same comparison the database makes: UPPER(value) = UPPER(expected).
            if str(value).upper() != str(expected).upper():
                return False
        elif operator == "in":
            if value not in expected:
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

    def filter(self, **lookups: Any) -> QuerySet:
        return QuerySet(self.model, [row for row in self._rows if _matches(row, lookups)])

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

    def order_by(self, field: str) -> QuerySet:
        """Sort by `field`, or by `-field` for descending order."""
        descending = field.startswith("-")
        rows = sorted(self._rows, key=lambda row: getattr(row, field.lstrip("-")))
        return QuerySet(self.model, rows)

    def update(self, **values: Any) -> int:
        for row in self._rows:
            for name, value in values.items():
                setattr(row, name, value)
        return len(self._rows)


class Manager:
    """The `objects` attribute of a model."""

    def __init__(self, model: type[Model]):
        self.model = model

    def all(self) -> QuerySet:
        return QuerySet(self.model, list(self.model._rows))

    def filter(self, **lookups: Any) -> QuerySet:
        return self.all().filter(**lookups)

    def get(self, **lookups: Any) -> Any:
        return self.all().get(**lookups)

    def create(self, **fields: Any) -> Any:
        row = self.model(**fields)
        row.id = self.model._next_id
        self.model._next_id += 1
        self.model._rows.append(row)
        return row


class Model:
    """Base class of every model. Subclasses are dataclasses whose `id` is set on create."""

    objects: ClassVar[Manager]
    DoesNotExist: ClassVar[type[DoesNotExist]]
    _rows: ClassVar[list[Any]]
    _next_id: ClassVar[int]
    _registry: ClassVar[list[type[Model]]] = []

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        cls._rows = []
        cls._next_id = 1
        cls.objects = Manager(cls)
        cls.DoesNotExist = type("DoesNotExist", (DoesNotExist,), {})
        Model._registry.append(cls)

    def save(self) -> None:
        """Rows are stored by reference, so there is nothing to write."""


def reset() -> None:
    """Empty every table. Used between tests."""
    for model in Model._registry:
        model._rows.clear()
        model._next_id = 1
