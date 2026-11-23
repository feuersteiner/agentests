"""Workspace endpoints for the support team."""

from admin_api import client


def delete_workspace(body: dict, workspace_id: str) -> tuple[int, dict]:
    """DELETE /admin/workspaces/<id>: delete a workspace and all its projects."""
    projects = client.find("project", workspace_id=workspace_id)
    for project in projects:
        client.delete(project["id"])
    client.delete(workspace_id)
    return 200, {"deleted": workspace_id, "projects": len(projects)}
