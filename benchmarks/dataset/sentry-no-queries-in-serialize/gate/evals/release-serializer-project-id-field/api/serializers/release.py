from __future__ import annotations

from typing import Any

from api.serializers.base import Serializer
from core.models import Release, User


class ReleaseSerializer(Serializer):
    def serialize(self, obj: Release, attrs: dict[str, Any], user: User) -> dict[str, Any]:
        return {
            "id": str(obj.id),
            "projectId": str(obj.project_id),
            "version": obj.version,
            "dateReleased": obj.date_released.isoformat(),
        }
