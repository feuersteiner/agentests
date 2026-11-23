import pytest

from ingest.client import ApiError


def make_events(count):
    return [{"id": f"e{n}", "kind": "click", "at": "2026-03-01T10:00:00Z"} for n in range(count)]


def test_list_events_returns_one_page(api, client):
    api.events = make_events(3)
    page = client.list_events()
    assert [item["id"] for item in page["events"]] == ["e0", "e1", "e2"]
    assert page["next"] is None


def test_get_json_raises_on_an_error_status(api, client):
    with pytest.raises(ApiError) as raised:
        client.get_json("/nowhere")
    assert raised.value.status == 404
    assert raised.value.path == "/nowhere"


def test_start_export_returns_the_job_id(api, client):
    assert client.start_export("events") == "exp-1"
    assert ("POST", "/exports") in api.requests


def test_export_status_reports_the_file_when_done(api, client):
    client.start_export("events")
    assert client.export_status("exp-1") == {"status": "done", "file": "/files/exp-1.csv"}


def test_download_saves_the_file(api, client, tmp_path):
    api.export_file = b"id,kind\ne0,click\n"
    destination = tmp_path / "export.csv"
    client.download("/files/exp-1.csv", destination)
    assert destination.read_bytes() == b"id,kind\ne0,click\n"
