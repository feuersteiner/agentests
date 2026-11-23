"""Dashboard endpoints."""

from __future__ import annotations

from api.bases import OrganizationEndpoint
from api.http import BadRequest, NotFound, Request, Response
from api.serializers import serialize_dashboard
from core.models import Dashboard, Organization, Project


class DashboardCopyEndpoint(OrganizationEndpoint):
    """POST /api/organizations/<org_slug>/dashboards/<dashboard_id>/copy/ with {"project_id": ...}"""

    def post(self, request: Request, organization: Organization, dashboard_id: str) -> Response:
        try:
            source = Dashboard.objects.get(id=int(dashboard_id), organization_id=organization.id)
        except Dashboard.DoesNotExist:
            raise NotFound("Dashboard not found")
        project_id = request.data.get("project_id")
        if not isinstance(project_id, int):
            raise BadRequest("project_id is required")
        try:
            target = Project.objects.get(id=project_id, organization_id=organization.id)
        except Project.DoesNotExist:
            raise NotFound("Project not found")

        copy = Dashboard.objects.create(
            organization_id=organization.id,
            project_id=target.id,
            title=str(request.data.get("title") or f"{source.title} (copy)"),
            widgets=[dict(widget) for widget in source.widgets],
        )
        return Response(status=201, data={**serialize_dashboard(copy), "widgets": copy.widgets})
