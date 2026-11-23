"""Alert rules: which rules fire for an incoming event."""

from __future__ import annotations

import operator
from dataclasses import dataclass

OPERATORS = {
    "gt": operator.gt,
    "gte": operator.ge,
    "lt": operator.lt,
    "lte": operator.le,
    "eq": operator.eq,
}


@dataclass(frozen=True)
class Condition:
    """One comparison of an event metric with a value, such as `p95_ms gt 2000`."""

    metric: str
    op: str
    value: float


@dataclass(frozen=True)
class Rule:
    id: int
    name: str
    org: str
    owner: str
    conditions: tuple[Condition, ...] = ()
    environment: str | None = None
    severity: str = "warning"


@dataclass(frozen=True)
class Alert:
    rule_id: int
    rule_name: str
    event_id: str
    owner: str
    severity: str


def event_environment(event: dict) -> str:
    """The environment an event was sent from, without its deploy suffix: `prod-2` is `prod`."""
    return event.get("tags", {}).get("env", "").split("-")[0]


def environment_matches(rule: Rule, event: dict) -> bool:
    if rule.environment is None:
        return True
    return rule.environment == event_environment(event)


def conditions_match(rule: Rule, event: dict) -> bool:
    if not rule.conditions:
        return False
    metrics = event.get("metrics", {})
    return all(
        condition.metric in metrics
        and OPERATORS[condition.op](metrics[condition.metric], condition.value)
        for condition in rule.conditions
    )


def matches(rule: Rule, event: dict) -> bool:
    return environment_matches(rule, event) and conditions_match(rule, event)


class RuleSet:
    """The rules of every organization, indexed for lookup by event."""

    def __init__(self, rules: tuple[Rule, ...] | list[Rule] = ()) -> None:
        self._by_org: dict[str, list[Rule]] = {}
        self._by_environment: dict[tuple[str, str], list[Rule]] = {}
        for rule in rules:
            self.add(rule)

    def add(self, rule: Rule) -> None:
        self._by_org.setdefault(rule.org, []).append(rule)
        if rule.environment is not None:
            key = (rule.org, rule.environment)
            self._by_environment.setdefault(key, []).append(rule)

    def candidates(self, event: dict) -> list[Rule]:
        """The rules that could fire for the event: those of its environment, then those of its org."""
        org = event["org"]
        scoped = self._by_environment.get((org, event_environment(event)), [])
        unscoped = [rule for rule in self._by_org.get(org, []) if rule.environment is None]
        return scoped + unscoped


def evaluate(rules: RuleSet, event: dict, seen: set[str]) -> list[Alert]:
    """The alerts the event raises. `seen` holds the fingerprints of earlier events."""
    fingerprint = event.get("fingerprint")
    if fingerprint is not None:
        if fingerprint in seen:
            return []
        seen.add(fingerprint)
    return [
        Alert(
            rule_id=rule.id,
            rule_name=rule.name,
            event_id=event["event_id"],
            owner=rule.owner,
            severity=rule.severity,
        )
        for rule in rules.candidates(event)
        if matches(rule, event)
    ]
