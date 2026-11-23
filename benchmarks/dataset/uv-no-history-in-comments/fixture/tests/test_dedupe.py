from csvtool.dedupe import dedupe


def test_keeps_first_row_of_each_key():
    rows = [
        {"id": "a", "total": "1"},
        {"id": "b", "total": "2"},
        {"id": "a", "total": "3"},
    ]
    assert dedupe(rows, "id") == [{"id": "a", "total": "1"}, {"id": "b", "total": "2"}]


def test_keeps_input_order():
    rows = [{"id": "c"}, {"id": "a"}, {"id": "b"}, {"id": "a"}]
    assert [row["id"] for row in dedupe(rows, "id")] == ["c", "a", "b"]


def test_empty_input():
    assert dedupe([], "id") == []
