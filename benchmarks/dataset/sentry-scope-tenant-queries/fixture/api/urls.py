"""The route table."""

from __future__ import annotations

import re

from api.bases import OrganizationEndpoint
from api.endpoints.projects import ProjectAlertsEndpoint, ProjectDetailEndpoint, ProjectListEndpoint
from api.http import HttpError, Request, Response

ORGANIZATION = r"^/api/organizations/(?P<org_slug>[a-z0-9-]+)"

urlpatterns: list[tuple[str, type[OrganizationEndpoint]]] = [
    (ORGANIZATION + r"/projects/$", ProjectListEndpoint),
    (ORGANIZATION + r"/projects/(?P<project_id>\d+)/$", ProjectDetailEndpoint),
    (ORGANIZATION + r"/projects/(?P<project_id>\d+)/alerts/$", ProjectAlertsEndpoint),
]


def handle(request: Request) -> Response:
    """Route `request` to its endpoint and turn HTTP errors into responses."""
    for pattern, endpoint in urlpatterns:
        match = re.match(pattern, request.path)
        if match is None:
            continue
        try:
            return endpoint().dispatch(request, **match.groupdict())
        except HttpError as error:
            return Response(status=error.status, data={"detail": error.detail})
    return Response(status=404, data={"detail": "Not found"})
