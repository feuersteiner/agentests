"""Tessera Tiles: trade customers' invoices, listed through the API and sent by email."""

from __future__ import annotations

from app import settings
from app.emails import send_email
from app.models import Invoice, invoices_page
from app.web import NotFound, Request, Response, json

PAGE_SIZE = 50


def list_invoices(request: Request) -> Response:
    """One page of the customer's invoices, with links to the neighbouring pages."""
    page = max(int(request.args.get("page", "1")), 1)
    items, has_more = invoices_page(request.user.account_id, page, PAGE_SIZE)
    here = request.host_url.rstrip("/") + request.path
    return json(
        {
            "items": [invoice.to_dict() for invoice in items],
            "next": f"{here}?page={page + 1}" if has_more else None,
            "previous": f"{here}?page={page - 1}" if page > 1 else None,
        }
    )


def email_invoice(request: Request, invoice_id: int) -> Response:
    """Send the invoice to the account's billing address, with a link to view and pay it."""
    invoice = Invoice.get(invoice_id)
    if invoice is None or invoice.account_id != request.user.account_id:
        raise NotFound("No such invoice.")
    link = f"{settings.SITE_URL}/invoices/{invoice.number}"
    send_email(
        to=invoice.account.billing_email,
        subject=f"Tessera Tiles invoice {invoice.number}",
        text=f"Your invoice {invoice.number} for {invoice.total_display} is ready.\n\nView and pay it: {link}\n",
    )
    return json({"sent": True})
