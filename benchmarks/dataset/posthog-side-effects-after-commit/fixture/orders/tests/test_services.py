import pytest

from orders import models, services, tasks
from store import config


def test_place_order_stores_the_order_and_its_items():
    order = services.place_order(1, [("PEA-01", 2), ("BEAN-07", 1)])

    assert order["status"] == "placed"
    assert order["total_cents"] == 2 * 295 + 349
    assert [(item["sku"], item["quantity"]) for item in models.list_order_items(order["id"])] == [
        ("PEA-01", 2),
        ("BEAN-07", 1),
    ]


def test_place_order_rejects_an_unknown_product():
    with pytest.raises(services.OrderError, match="NOPE-00"):
        services.place_order(1, [("NOPE-00", 1)])
    assert models.get_order(1) is None


def test_resend_confirmation_emails_the_customer(outside):
    order = services.place_order(1, [("PEA-01", 1)])

    services.resend_confirmation(order["id"])

    url, payload = outside[-1]
    assert url == config.MAIL_RELAY_URL
    assert payload["to"] == "mira@example.org"
    assert "£2.95" in payload["body"]


def test_generate_invoice_numbers_run_on():
    first = services.place_order(1, [("PEA-01", 1)])
    second = services.place_order(1, [("BEAN-07", 1)])

    assert services.generate_invoice(first["id"])["number"] == "FB-000001"
    assert services.generate_invoice(second["id"])["number"] == "FB-000002"


def test_render_invoice_pdf_task_runs_from_the_queue():
    order = services.place_order(1, [("PEA-01", 1)])
    invoice = services.generate_invoice(order["id"])

    tasks.render_invoice_pdf.delay(invoice["id"])

    assert tasks.run_pending() == 1
    assert "FB-000001" in tasks.rendered_pdfs


def test_delete_account_keeps_the_orders_without_the_customer():
    order = services.place_order(1, [("PEA-01", 1)])

    services.delete_account(1)

    assert models.get_customer(1) is None
    assert models.get_order(order["id"])["customer_id"] is None
