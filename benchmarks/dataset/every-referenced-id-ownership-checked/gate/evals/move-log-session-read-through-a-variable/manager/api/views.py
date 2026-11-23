"""The manager API: the serializer and the viewset of each resource."""

from __future__ import annotations

from core.db import QuerySet
from core.rest import ModelSerializer, ReadOnlyModelViewSet, Response, ValidationError, action
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

    @action(detail=True, methods=["post"])
    def move(self, request, pk):
        """Moves the log to another session."""
        log = self.get_object(pk)
        payload = request.data
        if not isinstance(payload, dict) or not isinstance(payload.get("session"), int):
            raise ValidationError({"session": "A session id is required."})
        target = payload["session"]
        log.session_id = target
        log.save()
        return Response(WorkoutLogSerializer(log).data)
