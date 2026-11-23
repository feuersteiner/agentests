"""Report exports. The export worker renders a report to CSV and calls `finish_export`."""

from datetime import datetime, timezone

from app import storage, store
from app.web import Request, Response, route


def export_blob_name(user_id: str, report_id: str) -> str:
    return f"{user_id}/{report_id}.csv"


@route("POST", "/exports")
def request_export(request: Request) -> Response:
    report_id = request.json.get("report_id")
    if not report_id:
        return Response(400, {"error": "report_id is required"})
    record = store.add_export(request.user_id, report_id, datetime.now(timezone.utc))
    return Response(202, _public(record))


@route("GET", "/exports")
def list_exports(request: Request) -> Response:
    records = sorted(store.user_exports(request.user_id), key=lambda r: r["requested_at"], reverse=True)
    return Response(200, {"exports": [_public(record) for record in records]})


def finish_export(user_id: str, report_id: str, csv: bytes) -> None:
    storage.upload_bytes(storage.EXPORTS, export_blob_name(user_id, report_id), csv, "text/csv")
    store.exports[(user_id, report_id)]["status"] = "ready"


def _public(record: dict) -> dict:
    return {
        "report_id": record["report_id"],
        "status": record["status"],
        "requested_at": record["requested_at"].isoformat(),
    }
