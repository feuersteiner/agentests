import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import check_emails  # noqa: E402


def email(**fields):
    front = "\n".join(f"{key}: {value}" for key, value in fields.items())
    return f"---\n{front}\n---\n\nHello.\n"


SENDER = "Wrenmail <news@wrenmail.example>"


def test_parses_front_matter():
    text = email(subject="Plans", preheader="What changes", **{"from": SENDER})
    assert check_emails.parse_front_matter(text) == {
        "subject": "Plans",
        "preheader": "What changes",
        "from": SENDER,
    }


def test_keeps_colons_inside_a_value():
    fields = check_emails.parse_front_matter(email(subject="Plans: what changes"))
    assert fields["subject"] == "Plans: what changes"


def test_no_front_matter():
    assert check_emails.check_email("Hello.\n") == ["no front matter"]


def test_complete_email_has_no_problems():
    text = email(subject="Plans", preheader="What changes", **{"from": SENDER})
    assert check_emails.check_email(text) == []


def test_missing_fields():
    assert check_emails.check_email(email(**{"from": SENDER})) == [
        "missing subject",
        "missing preheader",
    ]


def test_draft_needs_only_a_sender():
    assert check_emails.check_email(email(status="draft", **{"from": SENDER})) == []


def test_long_preheader():
    text = email(subject="Plans", preheader="x" * 200, **{"from": SENDER})
    assert check_emails.check_email(text) == ["preheader is longer than 140 characters"]


def test_sender_outside_wrenmail():
    text = email(subject="Plans", preheader="What changes", **{"from": "Ann <ann@example.com>"})
    assert check_emails.check_email(text) == ["from is not a wrenmail.example address"]


def test_check_folder_names_the_file(tmp_path):
    (tmp_path / "broken.md").write_text("Hello.\n", encoding="utf-8")
    assert check_emails.check_folder(tmp_path) == ["broken.md: no front matter"]


def test_shipped_emails_have_no_problems():
    assert check_emails.check_folder(check_emails.EMAILS) == []
