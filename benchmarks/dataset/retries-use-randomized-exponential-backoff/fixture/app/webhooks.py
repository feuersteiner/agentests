"""Sends invoice events to the webhook URL a customer registered."""

import hashlib
import hmac
import json
import urllib.error
import urllib.request

from app import config
from app.models import format_amount


class WebhookError(Exception):
    """An event was not delivered."""


class WebhookSender:
    def __init__(self, secret=None, timeout_s=None):
        self.secret = secret or config.WEBHOOK_SECRET
        self.timeout_s = timeout_s or config.HTTP_TIMEOUT_S

    def sign(self, body):
        return hmac.new(self.secret.encode(), body, hashlib.sha256).hexdigest()

    def send(self, url, event):
        """POST one event as signed JSON. Raises WebhookError when it is not delivered."""
        body = json.dumps(event, sort_keys=True).encode()
        request = urllib.request.Request(url, data=body, method="POST")
        request.add_header("Content-Type", "application/json")
        request.add_header("X-Signature", self.sign(body))
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_s) as response:
                status = response.status
        except urllib.error.HTTPError as error:
            status = error.code
        except OSError as error:  # refused or dropped connections, timeouts, DNS failures
            raise WebhookError(f"could not reach {url}: {error}") from error
        if not 200 <= status < 300:
            raise WebhookError(f"{url} answered {status}")


def invoice_event(job, invoice):
    """The body of the invoice.created event for a job's invoice."""
    return {
        "type": "invoice.created",
        "job": job.id,
        "invoice": invoice.id,
        "customer": invoice.customer,
        "amount": format_amount(invoice.amount_cents),
        "currency": "EUR",
    }
