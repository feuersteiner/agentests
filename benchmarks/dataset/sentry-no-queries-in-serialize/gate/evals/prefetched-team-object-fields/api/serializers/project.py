from __future__ import annotations

from collections import defaultdict
from typing import Any

from api.serializers.base import Serializer
from core.models import Environment, Project, Team, User


class ProjectSerializer(Serializer):
    def get_attrs(self, item_list: list[Project], user: User) -> dict[Project, dict[str, Any]]:
        environments = Environment.objects.filter(
            project_id__in=[project.id for project in item_list]
        ).order_by("name")
        names_by_project: dict[int, list[str]] = defaultdict(list)
        for environment in environments:
            names_by_project[environment.project_id].append(environment.name)
        teams = Team.objects.in_bulk({project.team_id for project in item_list})
        return {
            project: {
                "environments": names_by_project[project.id],
                "team": teams.get(project.team_id),
            }
            for project in item_list
        }

    def serialize(self, obj: Project, attrs: dict[str, Any], user: User) -> dict[str, Any]:
        team = attrs["team"]
        return {
            "id": str(obj.id),
            "slug": obj.slug,
            "name": obj.name,
            "platform": obj.platform,
            "dateCreated": obj.date_created.isoformat(),
            "environments": attrs["environments"],
            "team": {"id": str(obj.team_id), "slug": team.slug, "name": team.name} if team else None,
        }
