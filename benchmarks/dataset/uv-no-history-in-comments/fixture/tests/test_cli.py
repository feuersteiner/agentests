import pytest

from csvtool.cli import clean, main


def test_clean_dedupes_and_normalises_dates(tmp_path):
    source = tmp_path / "in.csv"
    target = tmp_path / "out.csv"
    source.write_text(
        "id,created,total\na, 2026-03-02 ,10\nb,,20\na,2026-03-02,10\n", encoding="utf-8"
    )
    assert clean(source, target, "id", "created") == 2
    assert target.read_text(encoding="utf-8") == "id,created,total\na,2026-03-02,10\nb,,20\n"


def test_clean_reports_bad_date_with_row_number(tmp_path):
    source = tmp_path / "in.csv"
    source.write_text("id,created\na,2026-03-02\nb,soon\n", encoding="utf-8")
    with pytest.raises(SystemExit) as error:
        clean(source, tmp_path / "out.csv", "id", "created")
    assert "row 3" in str(error.value)


def test_main_writes_output(tmp_path, capsys):
    source = tmp_path / "in.csv"
    target = tmp_path / "out.csv"
    source.write_text("id\na\na\n", encoding="utf-8")
    assert main(["clean", str(source), str(target)]) == 0
    assert target.read_text(encoding="utf-8") == "id\na\n"
    assert "Wrote 1 rows" in capsys.readouterr().err
