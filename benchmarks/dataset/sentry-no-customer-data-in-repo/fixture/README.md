# alerts

The alert rule engine of Pinewatch, a small monitoring service. It decides which alert rules fire
for an incoming event and builds the notification that goes out.

## Requirements

Python 3.9 or newer and pytest. Nothing else is needed.

## Layout

- `alerts/rules.py`: rules, conditions and `evaluate`, which returns the alerts an event raises.
- `alerts/formatting.py`: helpers that turn numbers and titles into text for a notification.
- `tests/`: the pytest suite.
- `tests/fixtures/events/`: sample events as JSON, loaded with `load_event` from `tests/conftest.py`.

## Usage

```python
from alerts.rules import Condition, Rule, RuleSet, evaluate

rules = RuleSet([
    Rule(id=1, name="p95 above threshold", org="org-slug", owner="user@example.com",
         conditions=(Condition("p95_ms", "gt", 2000),)),
])
alerts = evaluate(rules, event)
```

An event is a dictionary with an `event_id`, the `org` it belongs to, `tags`, `metrics` and an
optional `fingerprint`.
