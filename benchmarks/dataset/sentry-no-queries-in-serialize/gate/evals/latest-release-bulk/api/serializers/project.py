from __future__ import annotations

from collections import defaultdict
from typing import Any

from api.serializers.base import Serializer
from core.models import Environment, Project, Release, User


class ProjectSerializer(Serializer):
    def get_attrs(self, item_list: list[Project], user: User) -> dict[Project, dict[str, Any]]:
        project_ids = [project.id for project in item_list]
        environments = Environment.objects.filter(project_id__in=project_ids).order_by("name")
        names_by_project: dict[int, list[str]] = defaultdict(list)
        for environment in environments:
            names_by_project[environment.project_id].append(environment.name)

        latest_by_project: dict[int, Release] = {}
        releases = Release.objects.filter(project_id__in=project_ids).order_by("-date_released")
        for release in releases:
            latest_by_project.setdefault(release.project_id, release)

        return {
            project: {
                "environments": names_by_project[project.id],
                "latest_release": latest_by_project.get(project.id),
            }
            for project in item_list
        }

    def serialize(self, obj: Project, attrs: dict[str, Any], user: User) -> dict[str, Any]:
        latest = attrs["latest_release"]
        return {
            "id": str(obj.id),
            "slug": obj.slug,
            "name": obj.name,
            "platform": obj.platform,
            "dateCreated": obj.date_created.isoformat(),
            "environments": attrs["environments"],
            "latestRelease": (
                {"version": latest.version, "dateReleased": latest.date_released.isoformat()}
                if latest is not None
                else None
            ),
        }
