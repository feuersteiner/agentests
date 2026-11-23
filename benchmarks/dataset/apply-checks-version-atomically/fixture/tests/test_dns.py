import pytest

from enactor import dns


def test_fqdn_adds_the_trailing_dot():
    assert dns.fqdn("api.fernhill.example") == "api.fernhill.example."
    assert dns.fqdn("api.fernhill.example.") == "api.fernhill.example."


def test_validate_addresses_rejects_a_hostname():
    assert dns.validate_addresses(["203.0.113.4", "2001:db8::4"]) == ["203.0.113.4", "2001:db8::4"]
    with pytest.raises(ValueError):
        dns.validate_addresses(["203.0.113.4", "lb.fernhill.example"])


def test_backoff_delays_double():
    assert dns.backoff_delays(4, 0.5) == [0.5, 1.0, 2.0]
    assert dns.backoff_delays(1, 0.5) == []


def test_push_sends_the_fully_qualified_name(fake_dns):
    dns.push("api.fernhill.example", ["203.0.113.4"])
    assert fake_dns.records == {"api.fernhill.example.": ["203.0.113.4"]}


def test_push_tries_again_after_a_failure(fake_dns):
    fake_dns.fail_next("api.fernhill.example", times=2)
    dns.push("api.fernhill.example", ["203.0.113.4"])
    assert len(fake_dns.calls) == 3
    assert fake_dns.records["api.fernhill.example."] == ["203.0.113.4"]


def test_push_gives_up_after_every_attempt_fails(fake_dns):
    fake_dns.fail_next("api.fernhill.example", times=dns.ATTEMPTS)
    with pytest.raises(dns.PushError):
        dns.push("api.fernhill.example", ["203.0.113.4"])
    assert "api.fernhill.example." not in fake_dns.records
