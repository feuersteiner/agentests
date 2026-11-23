"""A small REST layer that reads like Django REST Framework: serializers, viewsets and a router."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, ClassVar

from core.db import Model, QuerySet


@dataclass
class Request:
    method: str
    path: str
    user: Any
    data: Any = field(default_factory=dict)
    query_params: dict[str, str] = field(default_factory=dict)


@dataclass
class Response:
    data: Any = None
    status: int = 200


class APIError(Exception):
    status = 500

    def __init__(self, detail: Any = ""):
        super().__init__(detail)
        self.detail = detail


class ValidationError(APIError):
    status = 400


class PermissionDenied(APIError):
    status = 403


class NotFound(APIError):
    status = 404


class MethodNotAllowed(APIError):
    status = 405


class ModelSerializer:
    """Turns a row into a JSON-ready dict, and a request body into values for a row.

    `fields` lists the keys of the JSON object. A key named in the model's `relations` is a
    foreign key: the body carries the related row's id, which must exist, and the row stores it as
    `<key>_id`. Keys in `read_only_fields` are returned but never taken from the body.
    """

    model: ClassVar[type[Model]]
    fields: ClassVar[tuple[str, ...]] = ()
    read_only_fields: ClassVar[tuple[str, ...]] = ("id",)

    def __init__(self, instance: Any = None, data: Any = None, partial: bool = False):
        self.instance = instance
        self.initial_data = data
        self.partial = partial
        self.validated_data: dict[str, Any] = {}
        self.errors: dict[str, str] = {}

    def writable_fields(self) -> list[str]:
        return [name for name in self.fields if name not in self.read_only_fields]

    def is_valid(self, raise_exception: bool = False) -> bool:
        self.validated_data, self.errors = {}, {}
        data = self.initial_data
        if not isinstance(data, dict):
            self.errors["non_field_errors"] = "Expected a JSON object."
        else:
            for name in self.writable_fields():
                if name not in data:
                    if not self.partial and self.instance is None and self.model.is_required(name):
                        self.errors[name] = "This field is required."
                    continue
                self._validate_field(name, data[name])
        if self.errors and raise_exception:
            raise ValidationError(self.errors)
        return not self.errors

    def _validate_field(self, name: str, value: Any) -> None:
        related = self.model.relations.get(name)
        if related is None:
            self.validated_data[name] = value
        elif value is None:
            self.validated_data[f"{name}_id"] = None
        elif isinstance(value, int) and related.objects.filter(id=value).exists():
            self.validated_data[f"{name}_id"] = value
        else:
            self.errors[name] = f'Invalid pk "{value}" - object does not exist.'

    def save(self, **extra: Any) -> Any:
        values = {**self.validated_data, **extra}
        if self.instance is None:
            self.instance = self.model.objects.create(**values)
        else:
            for name, value in values.items():
                setattr(self.instance, name, value)
            self.instance.save()
        return self.instance

    @property
    def data(self) -> dict[str, Any]:
        relations = self.model.relations
        return {
            name: getattr(self.instance, f"{name}_id" if name in relations else name)
            for name in self.fields
        }


def action(detail: bool, methods: list[str], url_path: str | None = None) -> Callable:
    """Marks a viewset method as an extra route: /<prefix>/<url_path>/ or /<prefix>/<pk>/<url_path>/."""

    def decorate(method: Callable) -> Callable:
        method.action = {  # type: ignore[attr-defined]
            "detail": detail,
            "methods": [name.upper() for name in methods],
            "url_path": url_path or method.__name__.replace("_", "-"),
        }
        return method

    return decorate


class GenericViewSet:
    serializer_class: ClassVar[type[ModelSerializer]]

    def __init__(self, request: Request):
        self.request = request

    def get_queryset(self) -> QuerySet:
        return self.serializer_class.model.objects.all()

    def get_object(self, pk: Any) -> Any:
        try:
            return self.get_queryset().get(id=int(pk))
        except (ValueError, LookupError):
            raise NotFound("Not found.")

    def get_serializer(self, *args: Any, **kwargs: Any) -> ModelSerializer:
        return self.serializer_class(*args, **kwargs)


class ReadOnlyModelViewSet(GenericViewSet):
    def list(self, request: Request) -> Response:
        return Response([self.get_serializer(row).data for row in self.get_queryset()])

    def retrieve(self, request: Request, pk: str) -> Response:
        return Response(self.get_serializer(self.get_object(pk)).data)


class ModelViewSet(ReadOnlyModelViewSet):
    def create(self, request: Request) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=201)

    def perform_create(self, serializer: ModelSerializer) -> None:
        serializer.save()

    def update(self, request: Request, pk: str, partial: bool = False) -> Response:
        serializer = self.get_serializer(self.get_object(pk), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request: Request, pk: str) -> Response:
        return self.update(request, pk, partial=True)

    def destroy(self, request: Request, pk: str) -> Response:
        self.get_object(pk).delete()
        return Response(status=204)


class Router:
    """Routes /api/<prefix>/... to the registered viewsets."""

    collection_methods = {"GET": "list", "POST": "create"}
    detail_methods = {"GET": "retrieve", "PUT": "update", "PATCH": "partial_update", "DELETE": "destroy"}

    def __init__(self, root: str = "/api/"):
        self.root = root
        self.registry: dict[str, type[GenericViewSet]] = {}

    def register(self, prefix: str, viewset: type[GenericViewSet]) -> None:
        self.registry[prefix] = viewset

    def handle(self, request: Request) -> Response:
        try:
            return self._dispatch(request)
        except APIError as error:
            return Response({"detail": error.detail}, status=error.status)

    def _dispatch(self, request: Request) -> Response:
        parts = [part for part in request.path.removeprefix(self.root).split("/") if part]
        viewset_class = self.registry.get(parts[0]) if parts else None
        if viewset_class is None or len(parts) > 3:
            raise NotFound("Not found.")
        viewset = viewset_class(request)
        method = request.method.upper()
        rest = parts[1:]
        if not rest:
            return self._call(viewset, self.collection_methods.get(method), request)
        extra = self._find_action(viewset_class, detail=False, url_path=rest[0])
        if len(rest) == 1 and extra is not None:
            return self._call(viewset, extra if method in getattr(viewset_class, extra).action["methods"] else None, request)
        if len(rest) == 1:
            return self._call(viewset, self.detail_methods.get(method), request, pk=rest[0])
        extra = self._find_action(viewset_class, detail=True, url_path=rest[1])
        if extra is None:
            raise NotFound("Not found.")
        allowed = method in getattr(viewset_class, extra).action["methods"]
        return self._call(viewset, extra if allowed else None, request, pk=rest[0])

    @staticmethod
    def _find_action(viewset_class: type, detail: bool, url_path: str) -> str | None:
        for name in dir(viewset_class):
            marker = getattr(getattr(viewset_class, name), "action", None)
            if isinstance(marker, dict) and marker["detail"] == detail and marker["url_path"] == url_path:
                return name
        return None

    @staticmethod
    def _call(viewset: GenericViewSet, name: str | None, request: Request, **kwargs: Any) -> Response:
        handler = getattr(viewset, name, None) if name else None
        if handler is None:
            raise MethodNotAllowed("Method not allowed.")
        return handler(request, **kwargs)
