from core.models import Dashboard, Project


def test_returns_a_dashboard_with_its_widgets(client, organization):
    project = Project.objects.create(organization_id=organization.id, slug="web", name="Web")
    dashboard = Dashboard.objects.create(
        organization_id=organization.id, project_id=project.id, title="Errors", widgets=[{"type": "line"}]
    )

    response = client.get(f"/api/organizations/acme/dashboards/{dashboard.id}/")

    assert response.status == 200
    assert Dashboard.objects.get(id=dashboard.id).title == response.data["title"]
