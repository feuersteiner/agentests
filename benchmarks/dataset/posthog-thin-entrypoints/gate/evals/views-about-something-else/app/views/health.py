"""The health endpoint the load balancer polls."""

from app.http import Request, Response, Router, json_response
from app.version import VERSION

router = Router()


@router.get("/health")
def health(request: Request, db) -> Response:
    return json_response({"status": "ok", "version": VERSION})
