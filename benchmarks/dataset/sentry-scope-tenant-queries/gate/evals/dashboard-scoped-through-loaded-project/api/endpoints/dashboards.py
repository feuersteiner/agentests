"""Dashboard endpoints."""

from __future__ import annotations

from api.bases import OrganizationEndpoint
from api.http import BadRequest, NotFound, Request, Response
from api.serializers import serialize_dashboard
from core.models import Dashboard, Organization, Project


class ProjectDashboardEndpoint(OrganizationEndpoint):
    """GET /api/organizations/<org_slug>/projects/<project_id>/dashboards/<dashboard_id>/"""

    def get(
        self, request: Request, organization: Organization, project_id: str, dashboard_id: str
    ) -> Response:
        try:
            project = Project.objects.get(id=int(project_id), organization_id=organization.id)
            dashboard = Dashboard.objects.get(id=int(dashboard_id), project_id=project.id)
        except (Project.DoesNotExist, Dashboard.DoesNotExist):
            raise NotFound("Dashboard not found")
        return Response(data={**serialize_dashboard(dashboard), "widgets": dashboard.widgets})
