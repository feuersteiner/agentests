"""Base classes for endpoints."""

from __future__ import annotations

from typing import Any

from api.http import Forbidden, NotFound, Request, Response
from core.models import Membership, Organization


class OrganizationEndpoint:
    """An endpoint under /api/organizations/<org_slug>/.

    `dispatch` resolves the organization from the URL slug, checks that the requesting user is a
    member of it, and calls the method named after the HTTP verb with the request, the
    organization and the route's remaining named groups.
    """

    def dispatch(self, request: Request, org_slug: str, **kwargs: Any) -> Response:
        try:
            organization = Organization.objects.get(slug=org_slug)
        except Organization.DoesNotExist:
            raise NotFound("Organization not found")
        is_member = Membership.objects.filter(
            organization_id=organization.id, user_id=request.user.id
        ).exists()
        if not is_member:
            raise Forbidden("You are not a member of this organisation")
        handler = getattr(self, request.method.lower(), None)
        if handler is None:
            return Response(status=405, data={"detail": "Method not allowed"})
        return handler(request, organization, **kwargs)
