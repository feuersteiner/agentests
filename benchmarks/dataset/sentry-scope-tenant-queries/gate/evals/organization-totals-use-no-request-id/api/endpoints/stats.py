"""Organization statistics."""

from __future__ import annotations

from api.bases import OrganizationEndpoint
from api.http import Request, Response
from core.models import Alert, Dashboard, Event, Organization, Project


class OrganizationStatsEndpoint(OrganizationEndpoint):
    def get(self, request: Request, organization: Organization) -> Response:
        events = Event.objects.filter(organization_id=organization.id)
        return Response(
            data={
                "projects": Project.objects.filter(organization_id=organization.id).count(),
                "dashboards": Dashboard.objects.filter(organization_id=organization.id).count(),
                "alerts": Alert.objects.filter(organization_id=organization.id).count(),
                "muted_alerts": Alert.objects.filter(
                    organization_id=organization.id, is_muted=True
                ).count(),
                "events": events.count(),
                "errors": events.filter(level="error").count(),
            }
        )
