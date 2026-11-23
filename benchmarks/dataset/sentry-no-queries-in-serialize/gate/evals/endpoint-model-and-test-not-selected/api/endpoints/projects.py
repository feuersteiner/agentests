"""Project endpoints."""

from __future__ import annotations

from api.http import NotFound, Request, Response
from core.models import Member, Project


def project_member_counts(request: Request) -> Response:
    projects = Project.objects.all().order_by("slug")
    return Response(
        data=[
            {
                "slug": project.slug,
                "team": project.team.name,
                "memberCount": Member.objects.filter(project_id=project.id).count(),
            }
            for project in projects
        ]
    )


def project_details(request: Request, slug: str) -> Response:
    try:
        project = Project.objects.get(slug=slug)
    except Project.DoesNotExist:
        raise NotFound("Project not found")
    return Response(data={"slug": project.slug, "openIssues": project.issue_set.count()})
