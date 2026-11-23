import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import ROOT, check_document, check_email, check_offer, check_repository

OFFER = """# Offer of employment: Sam Example

Dear Sam,

We are delighted to offer you the role.

Kind regards,

Signed for Fieldstone B.V.
Sanne de Wit, Recruiter
"""

EMAIL = """---
to: someone@mailbox.example
subject: "Re: Interview"
---

Hi,

Thursday at 10:00 CET works for us.

> Could we move the interview to Thursday?
"""


def test_document_with_heading_passes():
    assert check_document("website/about.md", "# About us\n\nWe make Rota.\n") == []


def test_document_without_heading():
    assert check_document("website/about.md", "About us\n\nWe make Rota.\n") == [
        "website/about.md: does not start with a top-level heading"
    ]


def test_signed_offer_passes():
    assert check_offer("offers/sam.md", OFFER) == []


def test_offer_without_sign_off():
    text = OFFER.replace("Signed for Fieldstone B.V.\n", "")
    assert check_offer("offers/sam.md", text) == [
        "offers/sam.md: does not end with 'Signed for Fieldstone B.V.' and the signer's name"
    ]


def test_complete_email_passes():
    assert check_email("outbox/example.md", EMAIL) == []


def test_email_without_subject():
    text = EMAIL.replace('subject: "Re: Interview"\n', "")
    assert check_email("outbox/example.md", text) == ["outbox/example.md: front matter has no subject"]


def test_repository_documents_pass():
    assert check_repository(ROOT) == []
