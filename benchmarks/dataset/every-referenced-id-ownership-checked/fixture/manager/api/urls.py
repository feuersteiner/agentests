"""The API's routes: each viewset under /api/<prefix>/."""

from __future__ import annotations

from core.rest import Request, Response, Router
from manager.api.views import (
    ExerciseViewSet,
    RoutineViewSet,
    SlotEntryViewSet,
    TemplateViewSet,
    WorkoutLogViewSet,
    WorkoutSessionViewSet,
)

router = Router()
router.register("exercises", ExerciseViewSet)
router.register("routines", RoutineViewSet)
router.register("templates", TemplateViewSet)
router.register("slot-entries", SlotEntryViewSet)
router.register("sessions", WorkoutSessionViewSet)
router.register("logs", WorkoutLogViewSet)


def handle(request: Request) -> Response:
    return router.handle(request)
