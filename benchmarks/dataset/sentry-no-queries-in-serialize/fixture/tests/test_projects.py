from datetime import datetime, timezone

from core.models import Environment, Project, Release


def test_lists_projects_in_slug_order(client, team):
    Project.objects.create(team_id=team.id, slug="web", name="Web")
    Project.objects.create(team_id=team.id, slug="api", name="API", platform="python")

    response = client.get("/api/projects/")

    assert response.status == 200
    assert [project["slug"] for project in response.data["results"]] == ["api", "web"]
    assert response.data["results"][0]["platform"] == "python"
    assert response.data["next"] is None


def test_lists_each_projects_environments(client, team):
    web = Project.objects.create(team_id=team.id, slug="web", name="Web")
    api = Project.objects.create(team_id=team.id, slug="api", name="API")
    Environment.objects.create(project_id=web.id, name="staging")
    Environment.objects.create(project_id=web.id, name="production")
    Environment.objects.create(project_id=api.id, name="production")

    response = client.get("/api/projects/")

    environments = {project["slug"]: project["environments"] for project in response.data["results"]}
    assert environments == {"api": ["production"], "web": ["production", "staging"]}


def test_returns_one_project(client, team):
    Project.objects.create(team_id=team.id, slug="web", name="Web")

    response = client.get("/api/projects/web/")

    assert response.status == 200
    assert response.data["name"] == "Web"
    assert response.data["environments"] == []


def test_unknown_project_is_not_found(client):
    response = client.get("/api/projects/nope/")

    assert response.status == 404
    assert response.data == {"detail": "Not found"}


def test_lists_a_projects_releases_newest_first(client, team):
    project = Project.objects.create(team_id=team.id, slug="web", name="Web")
    Release.objects.create(
        project_id=project.id, version="1.0.0", date_released=datetime(2026, 9, 1, tzinfo=timezone.utc)
    )
    Release.objects.create(
        project_id=project.id, version="1.1.0", date_released=datetime(2026, 10, 1, tzinfo=timezone.utc)
    )

    response = client.get("/api/projects/web/releases/")

    assert response.status == 200
    assert [release["version"] for release in response.data] == ["1.1.0", "1.0.0"]
    assert response.data[0]["dateReleased"] == "2026-10-01T00:00:00+00:00"
