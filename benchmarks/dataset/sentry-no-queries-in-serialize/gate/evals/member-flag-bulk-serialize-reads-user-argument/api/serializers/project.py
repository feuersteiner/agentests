from __future__ import annotations

from collections import defaultdict
from typing import Any

from api.serializers.base import Serializer
from core.models import Environment, Member, Project, User


class ProjectSerializer(Serializer):
    def get_attrs(self, item_list: list[Project], user: User) -> dict[Project, dict[str, Any]]:
        project_ids = [project.id for project in item_list]
        environments = Environment.objects.filter(project_id__in=project_ids).order_by("name")
        names_by_project: dict[int, list[str]] = defaultdict(list)
        for environment in environments:
            names_by_project[environment.project_id].append(environment.name)
        member_user_ids: dict[int, set[int]] = defaultdict(set)
        for project_id, user_id in Member.objects.filter(project_id__in=project_ids).values_list(
            "project_id", "user_id"
        ):
            member_user_ids[project_id].add(user_id)
        return {
            project: {
                "environments": names_by_project[project.id],
                "member_user_ids": member_user_ids[project.id],
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
            "isMember": user.id in attrs["member_user_ids"],
        }
