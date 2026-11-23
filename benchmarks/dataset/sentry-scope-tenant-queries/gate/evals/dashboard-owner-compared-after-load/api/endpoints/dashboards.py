"""Dashboard endpoints."""

from __future__ import annotations

from api.bases import OrganizationEndpoint
from api.http import BadRequest, NotFound, Request, Response
from api.serializers import serialize_dashboard
from core.models import Dashboard, Organization, Project


class DashboardDetailEndpoint(OrganizationEndpoint):
    def get(self, request: Request, organization: Organization, dashboard_id: str) -> Response:
        dashboard = Dashboard.objects.filter(id=int(dashboard_id)).first()
        if dashboard is None or dashboard.organization_id != organization.id:
            raise NotFound("Dashboard not found")
        return Response(data={**serialize_dashboard(dashboard), "widgets": dashboard.widgets})
