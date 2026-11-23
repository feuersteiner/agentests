from enactor import apply, store


def _set_gen(name, gen):
    store.connection().execute("UPDATE endpoints SET plan_gen = ? WHERE name = ?", (gen, name))


def test_skips_an_endpoint_on_a_newer_plan(add_plan, fake_dns):
    add_plan(5)
    _set_gen("api.fernhill.example", 7)
    assert apply.apply_latest_plan() == 5
    assert store.get_endpoint("api.fernhill.example").plan_gen == 7
    store.connection().execute("DELETE FROM plans WHERE gen < 6")
