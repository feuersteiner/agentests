from tools import slowlog

LOG = """\
2026-11-02 03:14:07 UTC [4121] LOG:  duration: 1532.118 ms  statement: SELECT * FROM lessons WHERE tutor_id = 42
2026-11-02 03:15:12 UTC [4122] LOG:  duration: 801.500 ms  statement: SELECT * FROM lessons WHERE tutor_id = 7
2026-11-02 03:20:44 UTC [4130] LOG:  duration: 2950.000 ms  statement: UPDATE invoices SET paid = true WHERE id = 1009
"""


def test_parse_line_reads_duration_and_statement():
    ms, sql = slowlog.parse_line(LOG.splitlines()[0])
    assert ms == 1532.118
    assert sql == "SELECT * FROM lessons WHERE tutor_id = 42"


def test_normalise_replaces_numbers_and_collapses_spaces():
    assert slowlog.normalise("SELECT *  FROM lessons\n WHERE tutor_id = 42 LIMIT 10") == (
        "SELECT * FROM lessons WHERE tutor_id = ? LIMIT ?"
    )


def test_normalise_replaces_quoted_strings():
    assert slowlog.normalise("SELECT * FROM tutors WHERE email = 'a@example.com'") == (
        "SELECT * FROM tutors WHERE email = ?"
    )
    assert slowlog.normalise("SELECT * FROM tutors WHERE name = 'O''Brien' AND id = 3") == (
        "SELECT * FROM tutors WHERE name = ? AND id = ?"
    )


def test_summarise_groups_statements_and_puts_most_time_first():
    groups = slowlog.summarise(LOG.splitlines())
    assert [(group.query, group.count) for group in groups] == [
        ("UPDATE invoices SET paid = true WHERE id = ?", 1),
        ("SELECT * FROM lessons WHERE tutor_id = ?", 2),
    ]
    assert groups[1].total_ms == 1532.118 + 801.5


def test_format_report_shows_the_ten_slowest_groups():
    lines = [
        f"2026-11-02 04:00:00 UTC [1] LOG:  duration: {n}.000 ms  statement: SELECT * FROM t{chr(97 + n)}"
        for n in range(1, 13)
    ]
    report = slowlog.format_report(slowlog.summarise(lines))
    assert len(report.splitlines()) == 10
    assert report.splitlines()[0].endswith("SELECT * FROM tm")
