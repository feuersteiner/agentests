"""Workspace endpoints for the support team."""

from admin_api import client
from admin_api.http import NotFound


def delete(body: dict, workspace_id: str) -> tuple[int, dict]:
    """DELETE /admin/workspaces/<id>: delete a workspace and all its projects."""
    try:
        workspace = client.get(workspace_id)
    except NotFound:
        return 404, {"error": "not found"}
    if workspace["type"] != "workspace":
        return 400, {"error": f"{workspace_id} is a {workspace['type']}, not a workspace"}

    projects = client.find("project", workspace_id=workspace_id)
    for project in projects:
        client.delete(project["id"], permanent=False)
    client.delete(workspace_id, permanent=False)
    return 200, {"deleted": workspace_id, "projects": [project["id"] for project in projects]}
