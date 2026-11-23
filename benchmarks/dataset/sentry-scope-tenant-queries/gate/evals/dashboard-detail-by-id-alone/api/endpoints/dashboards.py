"""Dashboard endpoints."""

from __future__ import annotations

from api.bases import OrganizationEndpoint
from api.http import BadRequest, NotFound, Request, Response
from api.serializers import serialize_dashboard
from core.models import Dashboard, Organization, Project


class DashboardDetailEndpoint(OrganizationEndpoint):
    def get(self, request: Request, organization: Organization, dashboard_id: str) -> Response:
        try:
            dashboard = Dashboard.objects.get(id=int(dashboard_id))
        except Dashboard.DoesNotExist:
            raise NotFound("Dashboard not found")
        body = serialize_dashboard(dashboard)
        body["widgets"] = list(dashboard.widgets)
        return Response(data=body)
