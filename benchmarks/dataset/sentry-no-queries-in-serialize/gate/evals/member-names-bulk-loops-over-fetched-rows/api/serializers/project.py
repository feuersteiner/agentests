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

        members = list(Member.objects.filter(project_id__in=project_ids))
        users = User.objects.in_bulk({member.user_id for member in members})
        member_names: dict[int, list[str]] = defaultdict(list)
        for member in members:
            member_user = users.get(member.user_id)
            if member_user is not None:
                member_names[member.project_id].append(member_user.name or member_user.email)

        return {
            project: {
                "environments": names_by_project[project.id],
                "members": sorted(member_names[project.id]),
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
            "members": attrs["members"],
        }
