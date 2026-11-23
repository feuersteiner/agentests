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
        muted = []
        for alert_id in _read_ids(request):
            try:
                alert = Alert.objects.get(id=alert_id)
            except Alert.DoesNotExist:
                raise NotFound(f"Alert {alert_id} not found")
            alert.is_muted = True
            alert.save()
            muted.append(serialize_alert(alert))
        return Response(data=muted)
