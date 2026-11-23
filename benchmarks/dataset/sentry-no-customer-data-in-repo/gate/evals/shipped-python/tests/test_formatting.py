from alerts.formatting import fmt_threshold, format_duration, truncate


def test_short_durations_are_in_milliseconds():
    assert format_duration(850) == "850ms"


def test_whole_seconds():
    assert format_duration(2000) == "2s"


def test_threshold_in_words():
    assert fmt_threshold("p95_ms", "gt", 2000) == "p95_ms above 2000"


def test_short_title_is_kept():
    assert truncate("p95 above threshold") == "p95 above threshold"
