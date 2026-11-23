import pytest

from enactor import store


def test_newest_plan_is_none_before_the_first_plan():
    assert store.newest_plan() is None


def test_newest_plan_has_the_highest_generation(add_plan):
    add_plan(7)
    add_plan(9)
    add_plan(8)
    plan = store.newest_plan()
    assert plan.gen == 9
    assert plan.records["api.fernhill.example"] == ["203.0.113.9"]


def test_get_plan_decodes_the_records(add_plan):
    add_plan(3, {"api.fernhill.example": ["198.51.100.1", "198.51.100.2"]})
    assert store.get_plan(3).records == {"api.fernhill.example": ["198.51.100.1", "198.51.100.2"]}
    assert store.get_plan(4) is None


def test_endpoints_start_without_a_plan():
    endpoints = store.list_endpoints()
    assert [endpoint.name for endpoint in endpoints] == [
        "api.fernhill.example",
        "edge.fernhill.example",
        "status.fernhill.example",
    ]
    assert all(endpoint.plan_gen == 0 for endpoint in endpoints)
    assert store.get_endpoint("edge.fernhill.example").applied_at is None
    assert store.get_endpoint("www.fernhill.example") is None


def test_transaction_rolls_back_when_the_block_raises():
    with pytest.raises(RuntimeError):
        with store.transaction() as conn:
            conn.execute("DELETE FROM endpoints")
            raise RuntimeError("stop")
    assert len(store.list_endpoints()) == 3


def test_inner_transaction_joins_the_outer_one():
    with pytest.raises(RuntimeError):
        with store.transaction() as conn:
            with store.transaction(immediate=True):
                conn.execute("DELETE FROM endpoints WHERE name = 'api.fernhill.example'")
            raise RuntimeError("stop")
    assert len(store.list_endpoints()) == 3
