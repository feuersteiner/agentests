"""The manager API: the serializer and the viewset of each resource."""

from __future__ import annotations

from core.db import QuerySet
from core.rest import ModelSerializer, NotFound, ReadOnlyModelViewSet, Response, action
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

    @action(detail=False, methods=["post"], url_path="from-template")
    def from_template(self, request):
        """Starts a new routine for the caller from a template, copying its slot entries."""
        template_id = request.data.get("template_id")
        template = Routine.objects.filter(id=template_id, is_template=True).first()
        if template is None or (template.user_id != request.user.id and not template.is_public):
            raise NotFound("Template not found.")
        routine = Routine.objects.create(
            user_id=request.user.id, name=template.name, description=template.description
        )
        for slot in SlotEntry.objects.filter(routine_id=template.id).order_by("order"):
            SlotEntry.objects.create(
                user_id=request.user.id,
                routine_id=routine.id,
                exercise_id=slot.exercise_id,
                sets=slot.sets,
                reps=slot.reps,
                weight=slot.weight,
                order=slot.order,
            )
        return Response(RoutineSerializer(routine).data, status=201)


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
