import pytest

from billing import repo, service


@pytest.fixture
def conn():
    connection = repo.connect()
    yield connection
    connection.close()


def test_sign_up_starts_a_free_trial(conn):
    customer_id = service.sign_up(conn, "ada@example.com")

    customer = repo.get_customer(conn, customer_id)
    assert customer.plan == "free"
    assert (customer.trial_ends_at - customer.signed_up_at).days == 14
    assert not customer.trial_extended


def test_change_plan_rejects_an_unknown_plan(conn):
    customer_id = service.sign_up(conn, "ada@example.com")

    with pytest.raises(KeyError):
        service.change_plan(conn, customer_id, "platinum")


def test_open_invoice_bills_the_plan_price(conn):
    customer_id = service.sign_up(conn, "grace@example.com")
    service.change_plan(conn, customer_id, "team")

    invoice = repo.get_invoice(conn, service.open_invoice(conn, customer_id))

    assert invoice.amount_cents == 2900
    assert invoice.paid_at is None


def test_record_payment_closes_the_invoice(conn):
    customer_id = service.sign_up(conn, "grace@example.com")
    service.change_plan(conn, customer_id, "team")
    invoice_id = service.open_invoice(conn, customer_id)

    service.record_payment(conn, invoice_id)

    assert repo.unpaid_invoices(conn, customer_id) == []
