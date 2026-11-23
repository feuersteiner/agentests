"""The route table."""

from __future__ import annotations

import re
from typing import Callable

from api.endpoints.projects import project_details, project_index, project_releases
from api.http import HttpError, Request, Response

urlpatterns: list[tuple[str, Callable[..., Response]]] = [
    (r"^/api/projects/$", project_index),
    (r"^/api/projects/(?P<slug>[a-z0-9-]+)/$", project_details),
    (r"^/api/projects/(?P<slug>[a-z0-9-]+)/releases/$", project_releases),
]


def handle(request: Request) -> Response:
    """Route `request` to its endpoint and turn HTTP errors into responses."""
    for pattern, endpoint in urlpatterns:
        match = re.match(pattern, request.path)
        if match is None:
            continue
        try:
            return endpoint(request, **match.groupdict())
        except HttpError as error:
            return Response(status=error.status, data={"detail": error.detail})
    return Response(status=404, data={"detail": "No such route"})
