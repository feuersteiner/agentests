"""The base serializer and `serialize`, which every endpoint uses to build its JSON."""

from __future__ import annotations

from typing import Any

from core.models import User


class Serializer:
    """Turns model objects into JSON-ready dicts.

    `serialize()` below calls `get_attrs` once with the whole list of objects, then calls the
    `serialize` method once per object with the attrs that `get_attrs` returned for it.
    """

    def get_attrs(self, item_list: list[Any], user: User) -> dict[Any, dict[str, Any]]:
        return {item: {} for item in item_list}

    def serialize(self, obj: Any, attrs: dict[str, Any], user: User) -> dict[str, Any]:
        raise NotImplementedError


def serialize(objects: Any, user: User, serializer: Serializer) -> Any:
    """Serialize one object, or a list of objects, with `serializer`."""
    if not isinstance(objects, (list, tuple)):
        return serialize([objects], user, serializer)[0]
    items = list(objects)
    attrs = serializer.get_attrs(items, user)
    return [serializer.serialize(item, attrs.get(item, {}), user) for item in items]
