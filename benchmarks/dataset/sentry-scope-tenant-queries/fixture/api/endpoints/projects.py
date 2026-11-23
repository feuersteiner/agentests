"""Project endpoints."""

from __future__ import annotations

from api.bases import OrganizationEndpoint
from api.http import BadRequest, NotFound, Request, Response
from api.pagination import DEFAULT_PER_PAGE, paginate
from api.serializers import serialize_alert, serialize_project
from core.models import Alert, Organization, Project
from core.slugs import slugify


class ProjectListEndpoint(OrganizationEndpoint):
    def get(self, request: Request, organization: Organization) -> Response:
        projects = Project.objects.filter(organization_id=organization.id).order_by("name")
        try:
            page = int(request.query.get("page", 1))
            per_page = int(request.query.get("per_page", DEFAULT_PER_PAGE))
        except ValueError:
            raise BadRequest("page and per_page must be numbers")
        if per_page < 1:
            raise BadRequest("per_page must be at least 1")
        body = paginate([serialize_project(project) for project in projects], page, per_page)
        return Response(data=body)

    def post(self, request: Request, organization: Organization) -> Response:
        name = str(request.data.get("name", "")).strip()
        if not name:
            raise BadRequest("name is required")
        slug = slugify(name)
        if Project.objects.filter(organization_id=organization.id, slug=slug).exists():
            raise BadRequest("A project with this name already exists")
        project = Project.objects.create(organization_id=organization.id, slug=slug, name=name)
        return Response(status=201, data=serialize_project(project))


class ProjectDetailEndpoint(OrganizationEndpoint):
    def get(self, request: Request, organization: Organization, project_id: str) -> Response:
        try:
            project = Project.objects.get(id=int(project_id), organization_id=organization.id)
        except Project.DoesNotExist:
            raise NotFound("Project not found")
        return Response(data=serialize_project(project))


class ProjectAlertsEndpoint(OrganizationEndpoint):
    def get(self, request: Request, organization: Organization, project_id: str) -> Response:
        try:
            project = Project.objects.get(id=int(project_id), organization_id=organization.id)
        except Project.DoesNotExist:
            raise NotFound("Project not found")
        alerts = Alert.objects.filter(
            organization_id=organization.id, project_id=project.id
        ).order_by("name")
        return Response(data=[serialize_alert(alert) for alert in alerts])
