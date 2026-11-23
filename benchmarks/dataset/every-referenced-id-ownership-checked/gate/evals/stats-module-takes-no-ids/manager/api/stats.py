"""Training statistics of the caller."""

from __future__ import annotations

from core.rest import GenericViewSet, Response, ValidationError, action
from manager.models import WorkoutLog
from manager.stats import weekly_volume


class StatsViewSet(GenericViewSet):
    @action(detail=False, methods=["get"])
    def volume(self, request):
        """The caller's weekly volume over the last ?weeks=<n> weeks, eight by default."""
        try:
            weeks = int(request.query_params.get("weeks", "8"))
        except ValueError:
            raise ValidationError({"weeks": "Must be a whole number."})
        if weeks < 1:
            raise ValidationError({"weeks": "Must be at least 1."})
        logs = WorkoutLog.objects.filter(user_id=request.user.id)
        recent = sorted(weekly_volume(logs).items())[-weeks:]
        return Response([{"week": week, "volume": total} for week, total in recent])
