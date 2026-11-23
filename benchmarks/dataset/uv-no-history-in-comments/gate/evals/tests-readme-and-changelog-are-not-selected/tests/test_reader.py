from csvtool.reader import read_rows


def test_reads_header_and_rows(tmp_path):
    path = tmp_path / "in.csv"
    path.write_text("id,name\n1,Ada\n2,Grace\n", encoding="utf-8")
    header, rows = read_rows(path)
    assert header == ["id", "name"]
    assert rows == [{"id": "1", "name": "Ada"}, {"id": "2", "name": "Grace"}]


def test_pads_short_rows(tmp_path):
    path = tmp_path / "in.csv"
    path.write_text("id,name,total\n1,Ada\n", encoding="utf-8")
    _, rows = read_rows(path)
    assert rows == [{"id": "1", "name": "Ada", "total": ""}]


def test_keeps_line_break_inside_quoted_cell(tmp_path):
    path = tmp_path / "in.csv"
    path.write_text('id,note\n1,"first\nsecond"\n', encoding="utf-8")
    _, rows = read_rows(path)
    assert rows == [{"id": "1", "note": "first\nsecond"}]


# Regression test: read_rows used to crash on BOM files, as requested in the
# ops ticket. Fixed by switching the encoding to utf-8-sig.
def test_strips_bom(tmp_path):
    path = tmp_path / "in.csv"
    path.write_bytes(b"\xef\xbb\xbfid,name\n1,Ada\n")
    header, _ = read_rows(path)
    assert header == ["id", "name"]
