import pytest

from admin_api import client, http


def test_get_returns_any_type(platform):
    assert client.get("r-a2")["name"] == "Kilnworks"
    assert client.get("r-b2")["app_key"] == "insight"


def test_get_unknown_id(platform):
    with pytest.raises(http.NotFound):
        client.get("r-ff")


def test_find_filters_by_type_and_fields(platform):
    assert [site["id"] for site in client.find("site", account_id="r-a1")] == ["r-51"]
    assert [app["id"] for app in client.find("app", app_key="insight")] == ["r-b2", "r-b3"]


def test_update_changes_fields(platform):
    assert client.update("r-a2", plan="team")["plan"] == "team"


def test_delete_takes_the_contents_too(platform):
    client.delete("r-c1", permanent=False)
    assert set(platform.trash) == {"r-c1", "r-d1", "r-d2"}
    client.restore("r-c1")
    assert platform.trash == {}
    assert client.get("r-d2")["workspace_id"] == "r-c1"
