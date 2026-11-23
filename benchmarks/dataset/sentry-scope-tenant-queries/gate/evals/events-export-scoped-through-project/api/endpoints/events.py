"""Event endpoints."""

from __future__ import annotations

import csv
import io

from api.bases import OrganizationEndpoint
from api.http import BadRequest, NotFound, Request, Response
from core.models import Event, Organization, Project

COLUMNS = ["id", "timestamp", "level", "message"]


def _to_csv(events) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(COLUMNS)
    for event in events:
        writer.writerow([event.id, event.timestamp.isoformat(), event.level, event.message])
    return buffer.getvalue()


def _read_project_id(request: Request) -> int:
    try:
        return int(request.query["project_id"])
    except (KeyError, ValueError):
        raise BadRequest("project_id is required and must be a number")


class EventExportEndpoint(OrganizationEndpoint):
    def get(self, request: Request, organization: Organization) -> Response:
        try:
            project = Project.objects.get(
                id=_read_project_id(request), organization_id=organization.id
            )
        except Project.DoesNotExist:
            raise NotFound("Project not found")
        events = Event.objects.filter(project_id=project.id).order_by("timestamp")

        return Response(
            data=_to_csv(events),
            content_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="events.csv"'},
        )
