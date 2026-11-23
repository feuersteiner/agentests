"""The base viewset for rows that belong to one user."""

from __future__ import annotations

from typing import Any

from core.db import Model, QuerySet
from core.rest import ModelSerializer, ModelViewSet, PermissionDenied, Request, Response


class OwnerObjectViewSet(ModelViewSet):
    """A viewset over rows that belong to one user through their `user_id`.

    `get_queryset()` returns only the caller's rows, so list, retrieve, update and destroy, and
    `get_object(pk)`, never reach another user's row. A new row is saved with the caller as its
    owner.

    `create()` and `update()` also pass the request body to `check_owner_objects()`, which reads
    the `(Model, "field")` pairs from `get_owner_objects()`: when the body carries `field`, the row
    of `Model` with that id must belong to the caller, or the request is refused with 403.
    """

    def get_owner_objects(self) -> list[tuple[type[Model], str]]:
        return []

    def check_owner_objects(self, data: dict[str, Any]) -> None:
        for model, field in self.get_owner_objects():
            pk = data.get(field) if isinstance(data, dict) else None
            if pk is None:
                continue
            row = model.objects.filter(id=pk).first()
            if row is None or row.user_id != self.request.user.id:
                raise PermissionDenied(f"You do not own {model.__name__} {pk}.")

    def get_queryset(self) -> QuerySet:
        return self.serializer_class.model.objects.filter(user_id=self.request.user.id)

    def create(self, request: Request) -> Response:
        self.check_owner_objects(request.data)
        return super().create(request)

    def perform_create(self, serializer: ModelSerializer) -> None:
        serializer.save(user_id=self.request.user.id)

    def update(self, request: Request, pk: str, partial: bool = False) -> Response:
        self.check_owner_objects(request.data)
        return super().update(request, pk, partial=partial)
