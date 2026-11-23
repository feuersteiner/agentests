"""Liveness check."""

from __future__ import annotations

from api.bases import OrganizationEndpoint
from api.http import Request, Response


class HealthEndpoint(OrganizationEndpoint):
    def get(self, request: Request, organization) -> Response:
        return Response(data={"status": "ok", "organization": organization.slug})
