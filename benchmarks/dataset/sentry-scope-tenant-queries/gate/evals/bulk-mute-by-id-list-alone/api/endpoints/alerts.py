"""Alert endpoints."""

from __future__ import annotations

from api.bases import OrganizationEndpoint
from api.http import BadRequest, NotFound, Request, Response
from api.serializers import serialize_alert
from core.models import Alert, Organization


def _read_ids(request: Request) -> list[int]:
    ids = request.data.get("ids")
    if not isinstance(ids, list) or not ids or not all(isinstance(item, int) for item in ids):
        raise BadRequest("ids must be a non-empty list of numbers")
    return ids


class AlertBulkMuteEndpoint(OrganizationEndpoint):
    def post(self, request: Request, organization: Organization) -> Response:
        ids = _read_ids(request)
        alerts = Alert.objects.filter(id__in=ids)
        alerts.update(is_muted=True)
        return Response(data={"muted": sorted(alert.id for alert in alerts)})
