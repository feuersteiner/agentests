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
        files.append(
            {"name": name, "size": blob.size, "url": storage.attachment_url(project_id, name)}
        )
    return Response(200, {"files": files})
