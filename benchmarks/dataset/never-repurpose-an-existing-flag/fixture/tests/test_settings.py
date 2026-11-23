import json

import pytest

from router.settings import DEFAULTS, load_settings


def test_defaults_without_a_file():
    assert load_settings() == DEFAULTS


def test_file_overrides_the_defaults(tmp_path):
    path = tmp_path / "router.json"
    path.write_text(json.dumps({"venue": "XNAS", "max_order_qty": 10_000}))
    settings = load_settings(path)
    assert settings["venue"] == "XNAS"
    assert settings["max_order_qty"] == 10_000
    assert settings["test_orders_allowed"] is False


def test_unknown_key_is_refused(tmp_path):
    path = tmp_path / "router.json"
    path.write_text(json.dumps({"venu": "XNAS"}))
    with pytest.raises(ValueError, match="venu"):
        load_settings(path)
