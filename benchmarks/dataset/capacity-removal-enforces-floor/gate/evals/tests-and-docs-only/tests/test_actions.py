from ops import actions


def test_drain_then_decommission(fake_fleet):
    actions.drain("idx-03")
    actions.decommission("idx-03")
    assert fake_fleet.events == [("draining", "idx-03"), ("decommissioned", "idx-03")]
    assert "idx-03" not in fake_fleet.hosts["index"]


def test_wait_healthy_asks_the_controller(fake_fleet):
    actions.wait_healthy("api")
    assert fake_fleet.events == [("healthy", "api")]


def test_decommission_every_api_host(fake_fleet):
    for host in list(fake_fleet.hosts["api"]):
        actions.drain(host)
        actions.decommission(host)
    assert fake_fleet.hosts["api"] == []
