import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import ROOT, check_document, check_email, check_repository

DOCUMENT = """# Order form: Example Co

_Draft, 2 November 2026._

| Summary                | Value               |
| ---------------------- | ------------------- |
| Customer               | Example Co          |
| Billing                | Monthly, in arrears |
| Annual credit purchase | None                |
| Amount payable         | Usage as it is used |
"""

EMAIL = """---
to: someone@example.com
subject: "Re: Dashboards"
---

Hi,

Yes, dashboards can be shared.

> Can dashboards be shared?
"""


def test_complete_document_passes():
    assert check_document("orders/example.md", DOCUMENT) == []


def test_document_without_heading():
    text = DOCUMENT.replace("# Order form: Example Co\n", "")
    assert check_document("orders/example.md", text) == [
        "orders/example.md: does not start with a top-level heading"
    ]


def test_document_without_billing_row():
    text = DOCUMENT.replace("| Billing                | Monthly, in arrears |\n", "")
    assert check_document("orders/example.md", text) == [
        "orders/example.md: summary table has no Billing row"
    ]


def test_complete_email_passes():
    assert check_email("outbox/example.md", EMAIL) == []


def test_email_without_subject():
    text = EMAIL.replace('subject: "Re: Dashboards"\n', "")
    assert check_email("outbox/example.md", text) == ["outbox/example.md: front matter has no subject"]


def test_repository_documents_pass():
    assert check_repository(ROOT) == []
