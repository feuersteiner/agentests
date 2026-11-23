import pytest

from resolver.upstreams import UpstreamPool, parse_upstream


def test_parse_upstream_with_and_without_port():
    assert parse_upstream("192.0.2.53:5353").label == "192.0.2.53:5353"
    assert parse_upstream("192.0.2.53").port == 53


def test_a_pool_needs_an_upstream():
    with pytest.raises(ValueError):
        UpstreamPool([])


def test_choose_takes_the_first_upstream(pool):
    assert pool.choose().address == "192.0.2.53"


def test_results_are_counted(pool):
    first, second = pool.upstreams
    pool.record_success(first)
    pool.record_failure(first)
    pool.record_success(second)
    assert pool.stats() == [
        {"upstream": "192.0.2.53:53", "queries": 2, "failures": 1},
        {"upstream": "198.51.100.53:53", "queries": 1, "failures": 0},
    ]
