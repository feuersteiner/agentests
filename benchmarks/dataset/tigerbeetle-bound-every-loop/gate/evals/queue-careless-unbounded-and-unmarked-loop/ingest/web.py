"""The handler behind POST /uploads."""

from ingest.util import format_bytes


def handle_upload(request, worker):
    """Queue an uploaded row file. `request` is {"json": {"name": ..., "body": ...}}."""
    upload = request.get("json") or {}
    if "name" not in upload:
        return {"status": 400, "json": {"error": "name is required"}}
    if "body" not in upload:
        return {"status": 400, "json": {"error": "body is required"}}
    worker.enqueue_upload(upload)
    size = format_bytes(len(upload["body"].encode()))
    return {"status": 202, "json": {"queued": True, "size": size}}
