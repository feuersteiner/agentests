import random

import pytest

from resolver.upstreams import UpstreamPool, parse_upstream


def test_parse_upstream_with_and_without_port():
    assert parse_upstream("192.0.2.53:5353").label == "192.0.2.53:5353"
    assert parse_upstream("192.0.2.53").port == 53


def test_a_pool_needs_an_upstream():
    with pytest.raises(ValueError):
        UpstreamPool([])


def test_parse_ipv6_upstreams():
    upstream = parse_upstream("[2001:db8::53]:5353")
    assert (upstream.address, upstream.port) == ("2001:db8::53", 5353)
    upstream = parse_upstream("2001:db8::53")
    assert (upstream.address, upstream.port) == ("2001:db8::53", 53)


def test_choose_prefers_the_faster_upstream(pool):
    random.seed(1)
    fast, slow = pool.upstreams
    fast.srtt_s, slow.srtt_s = 0.01, 0.1
    picks = [pool.choose() for _ in range(1000)]
    assert picks.count(fast) > 3 * picks.count(slow)


def test_results_are_counted(pool):
    first, second = pool.upstreams
    pool.record_success(first, 0.02)
    pool.record_failure(first)
    pool.record_success(second, 0.03)
    assert pool.stats() == [
        {"upstream": "192.0.2.53:53", "queries": 2, "failures": 1},
        {"upstream": "198.51.100.53:53", "queries": 1, "failures": 0},
    ]
