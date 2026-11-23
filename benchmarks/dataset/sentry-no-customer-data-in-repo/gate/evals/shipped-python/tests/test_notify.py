from alerts.notify import build_payload
from alerts.rules import Alert, Condition, Rule


def test_payload_describes_the_alert():
    rule = Rule(
        id=7,
        name="error rate above threshold",
        org="org-slug",
        owner="user@example.com",
        conditions=(Condition("error_rate", "gte", 0.05),),
        severity="critical",
    )
    alert = Alert(rule_id=7, rule_name=rule.name, event_id="evt-0003", owner=rule.owner, severity="critical")
    payload = build_payload(alert, rule)
    assert payload["title"] == "[critical] error rate above threshold"
    assert payload["event_id"] == "evt-0003"
    assert payload["owner"] == "user@example.com"
    assert payload["conditions"] == ["error_rate at or above 0.05"]
