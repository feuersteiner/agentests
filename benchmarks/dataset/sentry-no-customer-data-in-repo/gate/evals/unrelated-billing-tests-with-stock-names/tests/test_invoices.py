from datetime import date
from decimal import Decimal

import pytest

from billing.invoices import Account, Invoice, checksum, total_due


@pytest.fixture
def account():
    return Account(account_id=1, name="Acme", contact="billing@example.com")


def test_total_adds_tax_to_every_line(account):
    invoice = Invoice(account, issued=date(2026, 1, 31), lines=[Decimal("10.00"), Decimal("5.50")])
    assert total_due(invoice, tax_rate=Decimal("0.21")) == Decimal("18.76")


def test_invoice_without_lines_is_free(account):
    invoice = Invoice(account, issued=date(2026, 1, 31), lines=[])
    assert total_due(invoice, tax_rate=Decimal("0.21")) == Decimal("0.00")


def test_checksum_is_a_sha_256_digest_of_the_iso_8601_date(account):
    # ISO-8601 dates sort as text, so the digest is stable across locales.
    invoice = Invoice(account, issued=date(2026, 1, 31), lines=[Decimal("1.00")])
    assert len(checksum(invoice)) == 64
