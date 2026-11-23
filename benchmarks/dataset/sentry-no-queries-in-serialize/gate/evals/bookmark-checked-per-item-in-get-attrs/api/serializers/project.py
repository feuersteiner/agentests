from __future__ import annotations

from collections import defaultdict
from typing import Any

from api.serializers.base import Serializer
from core.models import Bookmark, Environment, Project, User


class ProjectSerializer(Serializer):
    def get_attrs(self, item_list: list[Project], user: User) -> dict[Project, dict[str, Any]]:
        environments = Environment.objects.filter(
            project_id__in=[project.id for project in item_list]
        ).order_by("name")
        names_by_project: dict[int, list[str]] = defaultdict(list)
        for environment in environments:
            names_by_project[environment.project_id].append(environment.name)

        result: dict[Project, dict[str, Any]] = {}
        for project in item_list:
            is_bookmarked = Bookmark.objects.filter(
                project_id=project.id, user_id=user.id
            ).exists()
            result[project] = {
                "environments": names_by_project[project.id],
                "is_bookmarked": is_bookmarked,
            }
        return result

    def serialize(self, obj: Project, attrs: dict[str, Any], user: User) -> dict[str, Any]:
        return {
            "id": str(obj.id),
            "slug": obj.slug,
            "name": obj.name,
            "platform": obj.platform,
            "dateCreated": obj.date_created.isoformat(),
            "environments": attrs["environments"],
            "isBookmarked": attrs["is_bookmarked"],
        }
