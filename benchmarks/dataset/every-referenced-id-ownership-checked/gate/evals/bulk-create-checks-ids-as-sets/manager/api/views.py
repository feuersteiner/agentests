"""The manager API: the serializer and the viewset of each resource."""

from __future__ import annotations

from core.db import QuerySet
from core.rest import ModelSerializer, PermissionDenied, ReadOnlyModelViewSet, Response, ValidationError, action
from core.viewsets import OwnerObjectViewSet
from manager.models import Exercise, Routine, SlotEntry, WorkoutLog, WorkoutSession


class ExerciseSerializer(ModelSerializer):
    model = Exercise
    fields = ("id", "name", "category")


class ExerciseViewSet(ReadOnlyModelViewSet):
    """The shared exercise catalogue."""

    serializer_class = ExerciseSerializer


class RoutineSerializer(ModelSerializer):
    model = Routine
    fields = ("id", "name", "description", "is_template", "is_public")


class RoutineViewSet(OwnerObjectViewSet):
    serializer_class = RoutineSerializer


class TemplateViewSet(ReadOnlyModelViewSet):
    """The templates a user can start from: their own and every public one."""

    serializer_class = RoutineSerializer

    def get_queryset(self) -> QuerySet:
        templates = Routine.objects.filter(is_template=True)
        return templates.filter(user_id=self.request.user.id) | templates.filter(is_public=True)


class SlotEntrySerializer(ModelSerializer):
    model = SlotEntry
    fields = ("id", "routine", "exercise", "order", "sets", "reps", "weight")


class SlotEntryViewSet(OwnerObjectViewSet):
    serializer_class = SlotEntrySerializer

    def get_owner_objects(self):
        return [(Routine, "routine")]


class WorkoutSessionSerializer(ModelSerializer):
    model = WorkoutSession
    fields = ("id", "routine", "date", "notes")


class WorkoutSessionViewSet(OwnerObjectViewSet):
    serializer_class = WorkoutSessionSerializer

    def get_owner_objects(self):
        return [(Routine, "routine")]


class WorkoutLogSerializer(ModelSerializer):
    model = WorkoutLog
    fields = ("id", "routine", "session", "exercise", "reps", "weight", "date")


class WorkoutLogViewSet(OwnerObjectViewSet):
    serializer_class = WorkoutLogSerializer

    def get_owner_objects(self):
        return [(Routine, "routine"), (WorkoutSession, "session")]

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_create(self, request):
        """Creates several logs from a list of log objects, all or none."""
        items = request.data
        if not isinstance(items, list) or not items:
            raise ValidationError("Expected a non-empty list of logs.")
        serializers = [self.get_serializer(data=item) for item in items]
        for serializer in serializers:
            serializer.is_valid(raise_exception=True)
        routine_ids = {item["routine"] for item in items if item.get("routine") is not None}
        session_ids = {item["session"] for item in items if item.get("session") is not None}
        owned_routines = Routine.objects.filter(id__in=routine_ids, user_id=request.user.id).count()
        owned_sessions = WorkoutSession.objects.filter(id__in=session_ids, user_id=request.user.id).count()
        if owned_routines != len(routine_ids) or owned_sessions != len(session_ids):
            raise PermissionDenied("Every routine and session must be your own.")
        for serializer in serializers:
            self.perform_create(serializer)
        return Response([serializer.data for serializer in serializers], status=201)
