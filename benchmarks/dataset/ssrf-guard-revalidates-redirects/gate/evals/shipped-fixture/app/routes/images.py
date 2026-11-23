"""Images members upload to show in their posts.

The client sends the file base64-encoded in JSON: {"content_type": "image/png", "data": "..."}.
"""

import base64
import binascii

from app import config, store
from app.web import App, Request, Response, error

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}


def register(app: App) -> None:
    app.route("POST", "/images")(upload_image)
    app.route("GET", "/images/<image_id>")(get_image)


def image_json(image: store.Image) -> dict:
    return {
        "id": image.id,
        "owner": image.owner,
        "content_type": image.content_type,
        "size": len(image.data),
        "created_at": image.created_at.isoformat(),
    }


def upload_image(request: Request) -> Response:
    if request.member_id not in store.members:
        return error(401, "sign in to upload")
    body = request.json or {}
    content_type = body.get("content_type")
    encoded = body.get("data") or ""
    if content_type not in ALLOWED_TYPES:
        return error(415, "images must be PNG, JPEG, GIF or WebP")
    if len(encoded) > config.MAX_IMAGE_BYTES:
        return error(413, "images can be at most 5 MB")
    try:
        data = base64.b64decode(encoded, validate=True)
    except binascii.Error:
        return error(400, "data must be base64")
    if not data:
        return error(400, "data is required")
    image = store.Image(
        id=store.next_id(),
        owner=request.member_id,
        content_type=content_type,
        data=data,
        created_at=store.now(),
    )
    store.images[image.id] = image
    return Response(image_json(image), status=201)


def get_image(request: Request, image_id: str) -> Response:
    image = store.images.get(int(image_id)) if image_id.isdigit() else None
    if image is None:
        return error(404, "no such image")
    return Response({**image_json(image), "data": base64.b64encode(image.data).decode()})
