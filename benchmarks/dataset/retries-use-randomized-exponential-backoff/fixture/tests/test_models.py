from app.models import Invoice, Job, format_amount


def test_job_from_dict(job_data):
    job = Job.from_dict(dict(job_data, amount_cents="1999", webhook_url="https://hooks.example/k"))
    assert job.amount_cents == 1999
    assert job.webhook_url == "https://hooks.example/k"


def test_job_without_webhook_url():
    job = Job.from_dict({"id": "j", "customer": "c", "shipment": "s", "amount_cents": 1})
    assert job.webhook_url is None


def test_invoice_from_api():
    invoice = Invoice.from_api({"id": "inv_1", "customer": "c", "amount_cents": "250", "status": "open"})
    assert invoice == Invoice("inv_1", "c", 250, "open")


def test_format_amount():
    assert format_amount(1999) == "19.99"
