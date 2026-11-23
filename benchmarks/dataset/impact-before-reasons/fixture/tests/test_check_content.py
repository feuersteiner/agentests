import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import check_content


def test_front_matter_is_split_from_the_body():
    fields, body = check_content.split_front_matter("---\ntitle: Roaming\n---\n\nBody.\n")
    assert fields == {"title": "Roaming"}
    assert body == "\nBody.\n"


def test_email_without_subject():
    text = "---\npreheader: Your SIM is on its way\n---\n\nHi.\n"
    assert check_content.check_email(text) == ["no subject"]


def test_email_with_long_subject():
    text = "---\nsubject: " + "a" * 71 + "\npreheader: Hello\n---\n\nHi.\n"
    assert check_content.check_email(text) == ["subject longer than 70 characters"]


def test_short_sms_has_no_problem():
    assert check_content.check_sms("Fernway: your bill is ready.") == []


def test_long_sms():
    assert check_content.check_sms("a" * 301) == ["longer than 300 characters"]


def test_notice_without_audience():
    text = "---\ntitle: Data Boost added\n---\n\nYou have 5GB more.\n"
    assert check_content.check_notice(text, ["basic", "plus"]) == ["no audience"]


def test_article_without_updated_date():
    text = "---\ntitle: Your monthly bill\n---\n\nBody.\n"
    assert check_content.check_article(text) == ["no updated"]


def test_shipped_messages_have_no_problems():
    assert check_content.collect(ROOT) == []
