import pytest

from ops import remove_capacity


def test_removes_the_host(fake_fleet, capsys):
    remove_capacity.main(["index", "idx-04"])
    assert "idx-04" not in fake_fleet.hosts["index"]
    assert len(fake_fleet.hosts["index"]) == 9
    assert capsys.readouterr().out == "removed idx-04 from index\n"


def test_drains_before_decommissioning_and_waits_after(fake_fleet):
    remove_capacity.main(["api", "api-03"])
    assert fake_fleet.events == [
        ("draining", "api-03"),
        ("decommissioned", "api-03"),
        ("healthy", "api"),
    ]


def test_unknown_host(fake_fleet):
    with pytest.raises(SystemExit, match="idx-99 is not a host of index"):
        remove_capacity.main(["index", "idx-99"])
    assert fake_fleet.events == []


def test_placement_keeps_its_last_five(fake_fleet):
    with pytest.raises(SystemExit, match="refusing"):
        remove_capacity.main(["placement", "plc-02"])
    assert len(fake_fleet.hosts["placement"]) == 5
    assert fake_fleet.events == []
