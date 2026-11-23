import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_adverts import REQUIRED_SECTIONS, check_advert, find_adverts, main


def advert(title: str = "# Account Executive", extra: str = "") -> str:
    sections = "".join(f"\n## {section}\n\nText.\n" for section in REQUIRED_SECTIONS)
    return f"{title}\n\nMunich · Sales · €85,000\n{sections}{extra}"


def test_a_complete_advert_has_no_problems():
    assert check_advert(advert()) == []


def test_an_advert_without_a_title_is_reported():
    assert check_advert(advert(title="Account Executive")) == [
        "line 1: the advert must start with a level-1 heading"
    ]


def test_a_missing_section_is_reported():
    text = advert().replace("## How to apply\n", "")
    assert check_advert(text) == ["missing section: How to apply"]


def test_a_long_line_is_reported_with_its_number():
    text = advert(extra="\n" + "x" * 101 + "\n")
    number = text.splitlines().index("x" * 101) + 1
    assert check_advert(text) == [f"line {number}: longer than 100 characters"]


def test_a_line_of_exactly_100_characters_is_allowed():
    assert check_advert(advert(extra="\n" + "x" * 100 + "\n")) == []


def test_a_leftover_placeholder_is_reported():
    text = advert(extra="\nApply by {{date}}.\n")
    number = text.splitlines().index("Apply by {{date}}.") + 1
    assert check_advert(text) == [f"line {number}: placeholder left in the text"]


def test_find_adverts_returns_markdown_files_only(tmp_path):
    adverts = tmp_path / "hiring" / "adverts"
    adverts.mkdir(parents=True)
    (adverts / "data-engineer.md").write_text(advert(), encoding="utf-8")
    (adverts / "notes.txt").write_text("not an advert\n", encoding="utf-8")
    assert find_adverts(tmp_path) == [adverts / "data-engineer.md"]


def test_main_reports_problems_and_returns_1(tmp_path, capsys):
    adverts = tmp_path / "hiring" / "adverts"
    adverts.mkdir(parents=True)
    (adverts / "data-engineer.md").write_text("Data Engineer\n", encoding="utf-8")
    assert main(tmp_path) == 1
    assert "hiring/adverts/data-engineer.md: line 1" in capsys.readouterr().out


def test_main_returns_0_when_every_advert_is_fine(tmp_path):
    adverts = tmp_path / "hiring" / "adverts"
    adverts.mkdir(parents=True)
    (adverts / "data-engineer.md").write_text(advert(), encoding="utf-8")
    assert main(tmp_path) == 0
