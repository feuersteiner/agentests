from __future__ import annotations

from collections import defaultdict
from typing import Any

from api.serializers.base import Serializer
from core.models import Bookmark, Environment, Project, User


class ProjectSerializer(Serializer):
    def get_attrs(self, item_list: list[Project], user: User) -> dict[Project, dict[str, Any]]:
        project_ids = [project.id for project in item_list]
        environments = Environment.objects.filter(project_id__in=project_ids).order_by("name")
        names_by_project: dict[int, list[str]] = defaultdict(list)
        for environment in environments:
            names_by_project[environment.project_id].append(environment.name)
        bookmarked = set(
            Bookmark.objects.filter(user_id=user.id, project_id__in=project_ids).values_list(
                "project_id", flat=True
            )
        )
        return {
            project: {
                "environments": names_by_project[project.id],
                "is_bookmarked": project.id in bookmarked,
            }
            for project in item_list
        }

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
