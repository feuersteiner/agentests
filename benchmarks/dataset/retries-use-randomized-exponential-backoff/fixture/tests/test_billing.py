import pytest

from app.clients.billing import BillingClient, BillingError
from app.models import Job


def test_create_invoice(billing_api, job_data):
    client = BillingClient(base_url=billing_api.url, token="t0ken")
    invoice = client.create_invoice(Job.from_dict(job_data))
    assert invoice.id == "inv_1"
    assert invoice.amount_cents == 1999
    request = billing_api.requests[0]
    assert request["body"]["idempotency_key"] == "job_1001"
    assert request["headers"]["Authorization"] == "Bearer t0ken"


def test_create_invoice_twice_returns_the_same_invoice(billing_api, job_data):
    client = BillingClient(base_url=billing_api.url)
    job = Job.from_dict(job_data)
    assert client.create_invoice(job) == client.create_invoice(job)
    assert len(billing_api.invoices) == 1


def test_create_invoice_raises_on_a_rejected_job(billing_api, job_data):
    client = BillingClient(base_url=billing_api.url)
    with pytest.raises(BillingError) as raised:
        client.create_invoice(Job.from_dict(dict(job_data, amount_cents=0)))
    assert raised.value.status == 400
    assert raised.value.path == "/invoices"


def test_get_invoice(billing_api, job_data):
    client = BillingClient(base_url=billing_api.url + "/")
    created = client.create_invoice(Job.from_dict(job_data))
    assert client.get_invoice(created.id) == created


def test_get_invoice_raises_when_missing(billing_api):
    with pytest.raises(BillingError) as raised:
        BillingClient(base_url=billing_api.url).get_invoice("inv_404")
    assert raised.value.status == 404
