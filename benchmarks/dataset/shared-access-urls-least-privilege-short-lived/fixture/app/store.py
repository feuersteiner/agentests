"""In-memory records. Production keeps these in Postgres; the API only needs this much of them."""

from datetime import datetime

# project id -> the ids of its members
project_members: dict[str, set[str]] = {}

# (user id, report id) -> the export's record
exports: dict[tuple[str, str], dict] = {}


def is_member(user_id: str, project_id: str) -> bool:
    return user_id in project_members.get(project_id, set())


def add_export(user_id: str, report_id: str, requested_at: datetime) -> dict:
    record = {"report_id": report_id, "status": "queued", "requested_at": requested_at}
    exports[(user_id, report_id)] = record
    return record


def user_exports(user_id: str) -> list[dict]:
    return [record for (owner, _), record in exports.items() if owner == user_id]


def reset() -> None:
    project_members.clear()
    exports.clear()
