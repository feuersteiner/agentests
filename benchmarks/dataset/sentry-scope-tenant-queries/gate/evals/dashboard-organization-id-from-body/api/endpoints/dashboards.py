"""Dashboard endpoints."""

from __future__ import annotations

from api.bases import OrganizationEndpoint
from api.http import BadRequest, NotFound, Request, Response
from api.serializers import serialize_dashboard
from core.models import Dashboard, Organization, Project


class DashboardRenameEndpoint(OrganizationEndpoint):
    def post(self, request: Request, organization: Organization, dashboard_id: str) -> Response:
        title = str(request.data.get("title", "")).strip()
        if not title:
            raise BadRequest("title is required")
        try:
            dashboard = Dashboard.objects.get(
                id=int(dashboard_id), organization_id=request.data["organization_id"]
            )
        except Dashboard.DoesNotExist:
            raise NotFound("Dashboard not found")
        dashboard.title = title
        dashboard.save()
        return Response(data=serialize_dashboard(dashboard))
