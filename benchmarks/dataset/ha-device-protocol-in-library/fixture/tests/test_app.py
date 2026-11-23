import asyncio
import json

from hearth.app import DEFAULT_REFRESH_SECONDS, load_config, setup
from hearth.hub import Hub


def test_load_config_fills_in_defaults(tmp_path):
    path = tmp_path / "config.json"
    path.write_text(json.dumps({}), encoding="utf-8")

    config = load_config(path)

    assert config == {"refresh_seconds": DEFAULT_REFRESH_SECONDS, "integrations": {}}


def test_load_config_keeps_the_refresh_period(tmp_path):
    path = tmp_path / "config.json"
    path.write_text(json.dumps({"refresh_seconds": 30}), encoding="utf-8")

    assert load_config(path)["refresh_seconds"] == 30


def test_setup_with_no_integrations_adds_no_entity():
    hub = Hub(session=object())

    asyncio.run(setup(hub, {"integrations": {}}))

    assert hub.states() == {}
