from core.models import Member, Project


def test_counts_members(client, team):
    project = Project.objects.create(team_id=team.id, slug="web", name="Web")
    Member.objects.create(project_id=project.id, user_id=1)

    response = client.get("/api/projects/")

    assert response.data["results"][0]["memberCount"] == Member.objects.filter(project_id=project.id).count()
