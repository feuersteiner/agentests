"""Workspace endpoints for the support team."""

from admin_api import client
from admin_api.http import NotFound


def delete_workspace(body: dict, workspace_id: str) -> tuple[int, dict]:
    """DELETE /admin/workspaces/<id>: move a workspace and all its projects to the trash."""
    try:
        client.get(workspace_id)
    except NotFound:
        return 404, {"error": "not found"}
    projects = client.find("project", workspace_id=workspace_id)
    for project in projects:
        client.delete(project["id"], permanent=False)
    client.delete(workspace_id, permanent=False)
    return 200, {"deleted": workspace_id, "projects": len(projects)}
