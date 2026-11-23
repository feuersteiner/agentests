"""Profile pictures. The browser sends the image to the API, which stores it as the user's
avatar blob."""

from azure.core.exceptions import ResourceNotFoundError

from app import config, storage
from app.web import Request, Response, route

ALLOWED_TYPES = {"image/png", "image/jpeg"}


@route("PUT", "/me/avatar")
def put_avatar(request: Request) -> Response:
    content_type = request.headers.get("content-type", "")
    if content_type not in ALLOWED_TYPES:
        return Response(415, {"error": "an avatar must be a PNG or JPEG image"})
    if len(request.body) > config.MAX_AVATAR_BYTES:
        return Response(413, {"error": "an avatar must be 2 MB or smaller"})
    storage.upload_bytes(storage.AVATARS, request.user_id, request.body, content_type)
    return Response(204)


@route("GET", "/users/<user_id>/avatar")
def get_avatar(request: Request, user_id: str) -> Response:
    try:
        data, content_type = storage.download(storage.AVATARS, user_id)
    except ResourceNotFoundError:
        return Response(404, {"error": "no avatar"})
    return Response(200, body=data, headers={"content-type": content_type})
