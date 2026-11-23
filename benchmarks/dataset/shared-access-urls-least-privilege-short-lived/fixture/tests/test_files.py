from app import storage, store
from app.web import Request, dispatch


def attach(project_id: str, name: str, data: bytes = b"%PDF-1.7") -> None:
    storage.upload_bytes(storage.ATTACHMENTS, f"{project_id}/{name}", data, "application/pdf")


def test_members_see_each_file_with_a_link():
    store.project_members["launch"] = {"u1"}
    attach("launch", "brief.pdf", b"12345")
    attach("launch", "budget.pdf")
    attach("other", "secret.pdf")

    response = dispatch(Request("GET", "/projects/launch/files", user_id="u1"))

    assert response.status == 200
    files = response.json["files"]
    assert [f["name"] for f in files] == ["brief.pdf", "budget.pdf"]
    assert files[0]["size"] == 5
    assert files[0]["url"].startswith(storage.blob_url(storage.ATTACHMENTS, "launch/brief.pdf") + "?")
    assert "sig=" in files[0]["url"]


def test_non_members_get_not_found():
    store.project_members["launch"] = {"u2"}
    attach("launch", "brief.pdf")

    response = dispatch(Request("GET", "/projects/launch/files", user_id="u1"))

    assert response.status == 404
