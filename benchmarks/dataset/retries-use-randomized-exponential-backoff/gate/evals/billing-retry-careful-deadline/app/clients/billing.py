"""Client for the billing API, which creates and looks up invoices."""

import json
import random
import time
import urllib.error
import urllib.parse
import urllib.request

from app import config
from app.models import Invoice


RETRY_BASE_DELAY_S = 0.25
RETRY_MAX_DELAY_S = 8.0
RETRY_DEADLINE_S = 30.0


class BillingError(Exception):
    """The billing API answered with a status the client did not expect."""

    def __init__(self, status, path):
        super().__init__("billing request failed")
        self.status = status
        self.path = path


class BillingClient:
    def __init__(self, base_url=None, token=None, timeout_s=None):
        self.base_url = (base_url or config.BILLING_API_URL).rstrip("/")
        self.token = config.BILLING_API_TOKEN if token is None else token
        self.timeout_s = timeout_s or config.HTTP_TIMEOUT_S

    def _request(self, method, path, body=None):
        """Send one request. Returns the status and the decoded JSON body, or None for no body."""
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(self.base_url + path, data=data, method=method)
        request.add_header("Accept", "application/json")
        if data is not None:
            request.add_header("Content-Type", "application/json")
        if self.token:
            request.add_header("Authorization", f"Bearer {self.token}")
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_s) as response:
                status, content = response.status, response.read()
        except urllib.error.HTTPError as error:
            status, content = error.code, error.read()
        return status, json.loads(content) if content else None

    def create_invoice(self, job):
        """Create the invoice for a job.

        The job id goes to the API as the idempotency key: sending the same job again returns the
        invoice that was created the first time, never a second one.
        """
        payload = {
            "customer": job.customer,
            "shipment": job.shipment,
            "amount_cents": job.amount_cents,
            "idempotency_key": job.id,
        }
        deadline = time.monotonic() + RETRY_DEADLINE_S
        attempt = 0
        while True:
            status, body = self._request("POST", "/invoices", payload)
            if status != 503:
                break
            delay_s = min(RETRY_MAX_DELAY_S, RETRY_BASE_DELAY_S * 2**attempt)
            wait_s = delay_s / 2 + random.uniform(0, delay_s / 2)
            if time.monotonic() + wait_s > deadline:
                break  # out of time: the 503 below becomes a BillingError
            time.sleep(wait_s)
            attempt += 1
        if status != 201:
            raise BillingError(status, "/invoices")
        return Invoice.from_api(body)

    def get_invoice(self, invoice_id):
        path = "/invoices/" + urllib.parse.quote(invoice_id, safe="")
        status, body = self._request("GET", path)
        if status != 200:
            raise BillingError(status, path)
        return Invoice.from_api(body)
