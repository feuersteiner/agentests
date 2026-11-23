from datetime import datetime, timezone

from app import storage, store
from app.routes.exports import finish_export
from app.web import Request, dispatch


def test_requesting_an_export_queues_it():
    response = dispatch(Request("POST", "/exports", user_id="u1", json={"report_id": "revenue"}))

    assert response.status == 202
    assert response.json["status"] == "queued"
    assert store.exports[("u1", "revenue")]["status"] == "queued"


def test_report_id_is_required():
    assert dispatch(Request("POST", "/exports", user_id="u1", json={})).status == 400


def test_users_see_only_their_own_exports():
    store.add_export("u1", "revenue", datetime(2026, 11, 2, tzinfo=timezone.utc))
    store.add_export("u2", "churn", datetime(2026, 11, 3, tzinfo=timezone.utc))

    response = dispatch(Request("GET", "/exports", user_id="u1"))

    assert [e["report_id"] for e in response.json["exports"]] == ["revenue"]


def test_finishing_an_export_stores_the_csv_and_marks_it_ready(blobs):
    store.add_export("u1", "revenue", datetime(2026, 11, 2, tzinfo=timezone.utc))

    finish_export("u1", "revenue", b"month,total\n2026-10,1200\n")

    assert store.exports[("u1", "revenue")]["status"] == "ready"
    assert blobs[(storage.EXPORTS, "u1/revenue.csv")].data.startswith(b"month,total")
