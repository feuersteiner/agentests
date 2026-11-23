"""Project endpoints."""

from __future__ import annotations

from api.http import BadRequest, NotFound, Request, Response
from api.pagination import DEFAULT_LIMIT, paginate
from api.serializers import ProjectSerializer, ReleaseSerializer, serialize
from core.models import Project


def _get_project(slug: str) -> Project:
    try:
        return Project.objects.get(slug=slug)
    except Project.DoesNotExist:
        raise NotFound("Not found")


def project_index(request: Request) -> Response:
    try:
        cursor = int(request.query.get("cursor", 0))
        limit = int(request.query.get("limit", DEFAULT_LIMIT))
    except ValueError:
        raise BadRequest("cursor and limit must be numbers")
    projects = list(Project.objects.all().order_by("slug"))
    page = paginate(projects, cursor, limit)
    page["results"] = serialize(page["results"], request.user, ProjectSerializer())
    return Response(data=page)


def project_details(request: Request, slug: str) -> Response:
    project = _get_project(slug)
    return Response(data=serialize(project, request.user, ProjectSerializer()))


def project_releases(request: Request, slug: str) -> Response:
    project = _get_project(slug)
    releases = list(project.release_set.order_by("-date_released"))
    return Response(data=serialize(releases, request.user, ReleaseSerializer()))
