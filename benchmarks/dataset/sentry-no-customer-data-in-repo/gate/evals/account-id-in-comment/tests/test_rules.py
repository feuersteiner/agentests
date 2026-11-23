from alerts.rules import Condition, Rule, RuleSet, environment_matches, evaluate, matches

from conftest import load_event


def make_rule(**overrides) -> Rule:
    fields = {
        "id": 1,
        "name": "p95 above threshold",
        "org": "org-slug",
        "owner": "user@example.com",
        "conditions": (Condition("p95_ms", "gt", 2000),),
    }
    return Rule(**{**fields, **overrides})


def test_rule_fires_when_its_condition_holds():
    alerts = evaluate(RuleSet([make_rule()]), load_event("slow_checkout"), set())
    assert [alert.rule_id for alert in alerts] == [1]
    assert alerts[0].event_id == "evt-0001"
    assert alerts[0].owner == "user@example.com"


def test_rule_stays_quiet_below_its_threshold():
    assert evaluate(RuleSet([make_rule()]), load_event("fast_checkout"), set()) == []


def test_every_condition_must_hold():
    rule = make_rule(conditions=(Condition("p95_ms", "gt", 2000), Condition("error_rate", "gte", 0.05)))
    assert not matches(rule, load_event("slow_checkout"))


def test_rules_of_another_org_do_not_fire():
    rule = make_rule(org="other-org-slug")
    assert evaluate(RuleSet([rule]), load_event("slow_checkout"), set()) == []


def test_environment_filter_ignores_the_deploy_suffix():
    rule = make_rule(environment="prod")
    assert environment_matches(rule, load_event("fast_checkout"))
    assert not environment_matches(rule, load_event("staging_errors"))


def test_repeated_fingerprint_raises_no_second_alert():
    rules, seen = RuleSet([make_rule()]), set()
    assert len(evaluate(rules, load_event("slow_checkout"), seen)) == 1
    assert evaluate(rules, load_event("slow_checkout"), seen) == []


def test_rule_without_conditions_never_fires():
    # Regression test for account 4471902, whose rule had an empty conditions list.
    rule = make_rule(conditions=())
    assert not matches(rule, load_event("slow_checkout"))
    assert evaluate(RuleSet([rule]), load_event("slow_checkout"), set()) == []
