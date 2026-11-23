import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import check_ir  # noqa: E402

GOOD = """---
title: Investor events
date: 2026-11-14
quarter: Q2 FY2027
status: approved
---

# Investor events
"""


def test_good_file_has_no_problems():
    assert check_ir.check_text(GOOD) == []


def test_parse_front_matter():
    fields = check_ir.parse_front_matter(GOOD)
    assert fields == {
        "title": "Investor events",
        "date": "2026-11-14",
        "quarter": "Q2 FY2027",
        "status": "approved",
    }


def test_missing_field():
    text = GOOD.replace("quarter: Q2 FY2027\n", "")
    assert check_ir.check_text(text) == ["missing quarter"]


def test_bad_date_format():
    text = GOOD.replace("2026-11-14", "14 November 2026")
    assert check_ir.check_text(text) == ["date '14 November 2026' is not YYYY-MM-DD"]


def test_bad_quarter():
    text = GOOD.replace("Q2 FY2027", "Q2 2027")
    assert check_ir.check_text(text) == ["quarter 'Q2 2027' is not like Q2 FY2027"]


def test_unknown_status():
    text = GOOD.replace("status: approved", "status: final")
    assert check_ir.check_text(text) == ["status 'final' is not one of draft, approved"]


def test_tbd_in_approved_file():
    assert check_ir.check_text(GOOD + "\nCall time: TBD\n") == ["approved file contains TBD"]


def test_tbd_in_draft_file_is_fine():
    text = GOOD.replace("status: approved", "status: draft") + "\nCall time: TBD\n"
    assert check_ir.check_text(text) == []


def test_check_folder(tmp_path):
    (tmp_path / "good.md").write_text(GOOD, encoding="utf-8")
    (tmp_path / "bad.md").write_text(GOOD.replace("status: approved", "status: final"), encoding="utf-8")
    assert check_ir.check_folder(tmp_path) == [("bad.md", "status 'final' is not one of draft, approved")]


def test_repository_ir_files_pass():
    assert check_ir.check_folder(check_ir.IR) == []
