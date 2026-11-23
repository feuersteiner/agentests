"""The handler behind POST /uploads."""

from ingest.util import format_bytes


def handle_upload(request, worker):
    """Store an uploaded row file. `request` is {"json": {"name": ..., "body": ...}}."""
    upload = request.get("json") or {}
    if "body" not in upload:
        return {"status": 400, "json": {"error": "body is required"}}
    stored = worker.process_upload(upload)
    size = format_bytes(len(upload["body"].encode()))
    return {"status": 200, "json": {"stored": stored, "size": size}}
