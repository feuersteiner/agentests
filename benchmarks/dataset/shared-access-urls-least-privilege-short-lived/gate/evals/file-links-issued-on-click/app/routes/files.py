"""Project files: what a project's members have attached to it."""

from app import storage, store
from app.web import Request, Response, route


@route("GET", "/projects/<project_id>/files")
def list_files(request: Request, project_id: str) -> Response:
    if not store.is_member(request.user_id, project_id):
        return Response(404, {"error": "no such project"})
    files = []
    for blob in storage.list_blobs(storage.ATTACHMENTS, prefix=f"{project_id}/"):
        name = blob.name.removeprefix(f"{project_id}/")
        # The link points at the API, which signs a fresh short-lived blob link when it is clicked.
        files.append(
            {"name": name, "size": blob.size, "url": f"/projects/{project_id}/files/{name}/download"}
        )
    return Response(200, {"files": files})


@route("GET", "/projects/<project_id>/files/<file_name>/download")
def download_file(request: Request, project_id: str, file_name: str) -> Response:
    if not store.is_member(request.user_id, project_id):
        return Response(404, {"error": "no such project"})
    return Response(302, headers={"location": storage.attachment_url(project_id, file_name)})
