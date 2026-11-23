"""Marrow & Vine's metrics library.

It keeps the part of prometheus_client's API the shop uses, so code reads the same against either:
Counter, Gauge and Histogram take a name, a help text and an optional list of label names. A
metric with label names is used through .labels(...), by position or by name, which returns the
series for those values; a metric without labels is used directly. render() writes every metric in
the Prometheus text format, which GET /metrics serves.
"""

from __future__ import annotations

import threading
import time
from contextlib import contextmanager

DEFAULT_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)

_REGISTRY: list[_Metric] = []
_LOCK = threading.Lock()


class _CounterSeries:
    def __init__(self) -> None:
        self.value = 0.0

    def inc(self, amount: float = 1) -> None:
        if amount < 0:
            raise ValueError("a counter only goes up")
        self.value += amount


class _GaugeSeries:
    def __init__(self) -> None:
        self.value = 0.0

    def set(self, value: float) -> None:
        self.value = float(value)

    def inc(self, amount: float = 1) -> None:
        self.value += amount

    def dec(self, amount: float = 1) -> None:
        self.value -= amount


class _HistogramSeries:
    def __init__(self, buckets: tuple[float, ...]) -> None:
        self.buckets = buckets
        self.counts = [0] * len(buckets)
        self.count = 0
        self.sum = 0.0

    def observe(self, value: float) -> None:
        self.count += 1
        self.sum += value
        for index, bound in enumerate(self.buckets):
            if value <= bound:
                self.counts[index] += 1

    @contextmanager
    def time(self):
        start = time.perf_counter()
        try:
            yield
        finally:
            self.observe(time.perf_counter() - start)


class _Metric:
    kind = ""

    def __init__(self, name: str, documentation: str, labelnames=(), **options) -> None:
        self.name = name
        self.documentation = documentation
        self.labelnames = tuple(labelnames)
        self.options = options
        self._series: dict[tuple[str, ...], object] = {}
        with _LOCK:
            _REGISTRY.append(self)

    def _new_series(self):
        raise NotImplementedError

    def labels(self, *values, **named):
        if not self.labelnames:
            raise ValueError(f"{self.name} has no labels")
        if named:
            if values or set(named) != set(self.labelnames):
                raise ValueError(f"{self.name} takes the labels {', '.join(self.labelnames)}")
            values = tuple(named[label] for label in self.labelnames)
        if len(values) != len(self.labelnames):
            raise ValueError(f"{self.name} takes {len(self.labelnames)} label values")
        return self._get(tuple(str(value) for value in values))

    def _get(self, key: tuple[str, ...]):
        with _LOCK:
            if key not in self._series:
                self._series[key] = self._new_series()
            return self._series[key]

    def _unlabelled(self):
        if self.labelnames:
            raise ValueError(f"{self.name} has labels: use .labels(...)")
        return self._get(())

    def _lines(self) -> list[str]:
        lines = [f"# HELP {self.name} {self.documentation}", f"# TYPE {self.name} {self.kind}"]
        for key, series in sorted(self._series.items()):
            pairs = list(zip(self.labelnames, key))
            lines.extend(self._sample_lines(pairs, series))
        return lines

    def _sample_lines(self, pairs, series) -> list[str]:
        return [f"{self.name}{_format_labels(pairs)} {series.value}"]


class Counter(_Metric):
    kind = "counter"

    def _new_series(self):
        return _CounterSeries()

    def inc(self, amount: float = 1) -> None:
        self._unlabelled().inc(amount)


class Gauge(_Metric):
    kind = "gauge"

    def _new_series(self):
        return _GaugeSeries()

    def set(self, value: float) -> None:
        self._unlabelled().set(value)

    def inc(self, amount: float = 1) -> None:
        self._unlabelled().inc(amount)

    def dec(self, amount: float = 1) -> None:
        self._unlabelled().dec(amount)


class Histogram(_Metric):
    kind = "histogram"

    def _new_series(self):
        return _HistogramSeries(tuple(self.options.get("buckets", DEFAULT_BUCKETS)))

    def observe(self, value: float) -> None:
        self._unlabelled().observe(value)

    def time(self):
        return self._unlabelled().time()

    def _sample_lines(self, pairs, series) -> list[str]:
        lines = []
        for bound, count in zip(series.buckets, series.counts):
            lines.append(f"{self.name}_bucket{_format_labels(pairs + [('le', bound)])} {count}")
        lines.append(f"{self.name}_bucket{_format_labels(pairs + [('le', '+Inf')])} {series.count}")
        lines.append(f"{self.name}_sum{_format_labels(pairs)} {series.sum}")
        lines.append(f"{self.name}_count{_format_labels(pairs)} {series.count}")
        return lines


def _format_labels(pairs) -> str:
    if not pairs:
        return ""
    inner = ",".join(f'{name}="{value}"' for name, value in pairs)
    return "{" + inner + "}"


def render() -> str:
    """Every registered metric in the Prometheus text exposition format."""
    lines: list[str] = []
    for metric in _REGISTRY:
        lines.extend(metric._lines())
    return "\n".join(lines) + "\n"


def reset() -> None:
    """Drops every recorded series, keeping the metrics registered. For tests."""
    with _LOCK:
        for metric in _REGISTRY:
            metric._series.clear()
