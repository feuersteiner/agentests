import pytest

from enactor import config

REQUIRED = {"ENACTOR_DNS_URL": "https://dns.test/v2", "ENACTOR_DNS_TOKEN": "t0ken"}


def test_parse_duration_reads_seconds_and_minutes():
    assert config.parse_duration("45") == 45.0
    assert config.parse_duration("45s") == 45.0
    assert config.parse_duration("5m") == 300.0
    assert config.parse_duration(" 2M ") == 120.0


def test_parse_duration_rejects_an_empty_value():
    with pytest.raises(ValueError):
        config.parse_duration("  ")


def test_load_uses_the_defaults():
    settings = config.load(REQUIRED)
    assert settings.db_path == "enactor.sqlite3"
    assert settings.interval_seconds == 30.0
    assert settings.dns_url == "https://dns.test/v2"


def test_load_reads_the_interval():
    assert config.load({**REQUIRED, "ENACTOR_INTERVAL": "2m"}).interval_seconds == 120.0


def test_load_names_the_missing_settings():
    with pytest.raises(ValueError, match="ENACTOR_DNS_TOKEN"):
        config.load({"ENACTOR_DNS_URL": "https://dns.test/v2"})
