import pytest

from admin_api import client
from scripts import remove_insight_app


def write_csv(tmp_path, *ids):
    path = tmp_path / "ids.csv"
    path.write_text("id,customer\n" + "".join(f"{i},Someone\n" for i in ids))
    return str(path)


def test_moves_the_insight_apps_to_the_trash(platform, tmp_path):
    remove_insight_app.main([write_csv(tmp_path, "r-b2", "r-b3")])
    assert set(platform.trash) == {"r-b2", "r-b3"}
    assert platform.erased == []


def test_a_site_id_stops_everything(platform, tmp_path):
    with pytest.raises(SystemExit, match="r-51"):
        remove_insight_app.main([write_csv(tmp_path, "r-b2", "r-51")])
    assert platform.trash == {}


def test_trash_can_be_undone(platform, tmp_path):
    remove_insight_app.main([write_csv(tmp_path, "r-b2")])
    client.restore("r-b2")
    client.delete("r-b2", permanent=False)
    assert "r-b2" in platform.trash
