import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_adverts import REQUIRED_SECTIONS, check_advert, check_roles, find_adverts, main

COMPLETE = "# Product Designer\n\n" + "\n\ntext\n\n".join(REQUIRED_SECTIONS) + "\n\ntext\n"


def write_roles(root: Path, roles: list[dict]) -> None:
    (root / "data").mkdir(exist_ok=True)
    (root / "data" / "open-roles.json").write_text(json.dumps({"roles": roles}), encoding="utf-8")


def test_a_complete_advert_has_no_problems():
    assert check_advert(COMPLETE) == []


def test_an_advert_without_a_title_is_reported():
    problems = check_advert(COMPLETE.replace("# Product Designer", "Product Designer"))
    assert problems == ["line 1: the advert must start with a level-1 heading"]


def test_a_missing_section_is_reported():
    problems = check_advert(COMPLETE.replace("## How to apply\n", ""))
    assert problems == ["missing section: ## How to apply"]


def test_a_long_line_is_reported_with_its_number():
    problems = check_advert(COMPLETE + "x" * 101 + "\n")
    assert problems == [f"line {len(COMPLETE.splitlines()) + 1}: longer than 100 characters"]


def test_find_adverts_returns_markdown_files_only(tmp_path):
    adverts = tmp_path / "hiring" / "adverts"
    adverts.mkdir(parents=True)
    (adverts / "designer.md").write_text(COMPLETE, encoding="utf-8")
    (adverts / "notes.txt").write_text("not an advert\n", encoding="utf-8")
    assert find_adverts(tmp_path) == [adverts / "designer.md"]


def test_an_open_role_without_its_advert_is_reported(tmp_path):
    write_roles(tmp_path, [{"id": "designer", "status": "open", "advert": "hiring/adverts/d.md"}])
    assert check_roles(tmp_path) == [
        "role designer is open but its advert hiring/adverts/d.md does not exist"
    ]


def test_a_draft_role_needs_no_advert(tmp_path):
    write_roles(tmp_path, [{"id": "marketer", "status": "draft", "advert": None}])
    assert check_roles(tmp_path) == []


def test_main_reports_problems_and_returns_1(tmp_path, capsys):
    adverts = tmp_path / "hiring" / "adverts"
    adverts.mkdir(parents=True)
    (adverts / "designer.md").write_text("Designer\n", encoding="utf-8")
    write_roles(tmp_path, [])
    assert main(tmp_path) == 1
    assert "hiring/adverts/designer.md: line 1" in capsys.readouterr().out


def test_main_returns_0_when_everything_is_fine(tmp_path):
    adverts = tmp_path / "hiring" / "adverts"
    adverts.mkdir(parents=True)
    (adverts / "designer.md").write_text(COMPLETE, encoding="utf-8")
    write_roles(tmp_path, [{"id": "designer", "status": "open", "advert": "hiring/adverts/designer.md"}])
    assert main(tmp_path) == 0
