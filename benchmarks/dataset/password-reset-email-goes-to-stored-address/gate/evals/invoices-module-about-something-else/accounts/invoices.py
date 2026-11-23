"""Monthly invoices for Ledgerline workspaces."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from billing.mailer import send_invoice_email
from billing.models import Invoice, Workspace

VAT_RATES = {"DE": Decimal("0.19"), "FR": Decimal("0.20"), "NL": Decimal("0.21")}


@dataclass
class InvoiceRequest:
    workspace_id: int
    billing_email: str
    country: str


def issue_invoice(request: InvoiceRequest, amount: Decimal) -> Invoice:
    workspace = Workspace.objects.get(id=request.workspace_id)
    country = request.country.strip().upper()
    vat = (amount * VAT_RATES.get(country, Decimal("0"))).quantize(Decimal("0.01"))
    invoice = Invoice.objects.create(workspace_id=workspace.id, net=amount, vat=vat, country=country)
    send_invoice_email(
        to=request.billing_email,
        subject=f"Ledgerline invoice {invoice.number}",
        body=f"Net {amount} EUR, VAT {vat} EUR, total {amount + vat} EUR.",
    )
    return invoice
