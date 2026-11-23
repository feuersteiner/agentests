from core.models import Alert, Project, User


def test_lists_projects_in_name_order(client, organization):
    Project.objects.create(organization_id=organization.id, slug="web", name="Web")
    Project.objects.create(organization_id=organization.id, slug="api", name="API")

    response = client.get("/api/organizations/acme/projects/")

    assert response.status == 200
    assert [project["slug"] for project in response.data["results"]] == ["api", "web"]
    assert response.data["total"] == 2


def test_creates_a_project_with_a_slug(client, organization):
    response = client.post("/api/organizations/acme/projects/", {"name": "Checkout"})

    assert response.status == 201
    assert response.data["slug"] == "checkout"
    assert Project.objects.filter(organization_id=organization.id).count() == 1


def test_rejects_a_project_without_a_name(client, organization):
    response = client.post("/api/organizations/acme/projects/", {"name": "  "})

    assert response.status == 400


def test_returns_one_project(client, organization):
    project = Project.objects.create(organization_id=organization.id, slug="web", name="Web")

    response = client.get(f"/api/organizations/acme/projects/{project.id}/")

    assert response.status == 200
    assert response.data["name"] == "Web"


def test_unknown_project_is_not_found(client, organization):
    response = client.get("/api/organizations/acme/projects/999/")

    assert response.status == 404


def test_lists_a_projects_alerts(client, organization):
    project = Project.objects.create(organization_id=organization.id, slug="web", name="Web")
    Alert.objects.create(organization_id=organization.id, project_id=project.id, name="Error spike")

    response = client.get(f"/api/organizations/acme/projects/{project.id}/alerts/")

    assert response.status == 200
    assert response.data == [
        {"id": 1, "project_id": project.id, "name": "Error spike", "threshold": 1, "is_muted": False}
    ]


def test_non_member_is_forbidden(organization):
    from tests.conftest import Client

    outsider = User.objects.create(email="outsider@example.com")

    response = Client(outsider).get("/api/organizations/acme/projects/")

    assert response.status == 403
