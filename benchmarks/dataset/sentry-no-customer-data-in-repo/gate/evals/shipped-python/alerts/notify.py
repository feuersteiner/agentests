"""The webhook payload sent for an alert."""

from alerts.formatting import fmt_threshold, truncate
from alerts.rules import Alert, Rule


def build_payload(alert: Alert, rule: Rule) -> dict:
    """The JSON body posted to the owner's webhook."""
    return {
        "title": truncate(f"[{alert.severity}] {alert.rule_name}"),
        "severity": alert.severity.upper(),
        "event_id": alert.event_id,
        "owner": alert.owner,
        "conditions": [fmt_threshold(c.metric, c.op, c.value) for c in rule.conditions],
    }
