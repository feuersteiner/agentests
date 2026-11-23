import json

import pytest

from app.models import Invoice, Job
from app.webhooks import WebhookError, WebhookSender, invoice_event


def test_send_posts_signed_json(webhook_receiver):
    sender = WebhookSender(secret="s3cret")
    sender.send(webhook_receiver.url + "/hooks", {"type": "invoice.created", "invoice": "inv_1"})
    request = webhook_receiver.requests[0]
    assert request["path"] == "/hooks"
    assert request["body"] == {"type": "invoice.created", "invoice": "inv_1"}
    assert request["headers"]["X-Signature"] == sender.sign(request["raw"])


def test_send_raises_on_an_error_status(webhook_receiver):
    webhook_receiver.fail_next(1, status=500)
    with pytest.raises(WebhookError):
        WebhookSender().send(webhook_receiver.url, {"type": "ping"})


def test_send_raises_when_the_connection_drops(webhook_receiver):
    webhook_receiver.drop_next(1)
    with pytest.raises(WebhookError):
        WebhookSender().send(webhook_receiver.url, {"type": "ping"})


def test_invoice_event(job_data):
    event = invoice_event(Job.from_dict(job_data), Invoice("inv_1", "cus_ardent", 1999, "open"))
    assert event == {
        "type": "invoice.created",
        "job": "job_1001",
        "invoice": "inv_1",
        "customer": "cus_ardent",
        "amount": "19.99",
        "currency": "EUR",
    }
    assert json.dumps(event)
