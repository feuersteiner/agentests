"""The invoicing worker: pops invoice jobs off the Redis queue and handles them one at a time.

Run it with `python -m app.worker`.
"""

import json
import logging
import threading

from app import config, db
from app.clients.billing import BillingClient
from app.models import Job, format_amount
from app.webhooks import WebhookError, WebhookSender, invoice_event

logger = logging.getLogger("app.worker")


class JobQueue:
    """The Redis list the booking API pushes jobs onto.

    `pop` raises ConnectionError when the connection to Redis drops.
    """

    def __init__(self, client, connection_errors=(ConnectionError,)):
        self.client = client
        self.connection_errors = connection_errors

    def pop(self, timeout_s):
        """The next job, or None when none arrives within timeout_s seconds."""
        try:
            item = self.client.brpop([config.QUEUE_NAME], timeout=timeout_s)
        except self.connection_errors as error:
            raise ConnectionError(f"lost the connection to Redis: {error}") from error
        if item is None:
            return None
        _, payload = item
        return Job.from_dict(json.loads(payload))


def connect_queue():
    """Connect to the job queue. The redis package is part of the production extra."""
    import redis

    client = redis.Redis.from_url(config.REDIS_URL, socket_timeout=config.QUEUE_POP_TIMEOUT_S + 5)
    return JobQueue(client, (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError))


class Processor:
    """Handles one job: create the invoice, record it, and tell the customer."""

    def __init__(self, database, billing, webhooks):
        self.database = database
        self.billing = billing
        self.webhooks = webhooks

    def __call__(self, job):
        invoice = self.billing.create_invoice(job)
        self.database.save_invoice(job, invoice)
        if job.webhook_url:
            try:
                self.webhooks.send(job.webhook_url, invoice_event(job, invoice))
            except WebhookError as error:
                logger.warning("job %s: webhook not delivered: %s", job.id, error)
        logger.info("job %s: invoice %s for %s", job.id, invoice.id, format_amount(invoice.amount_cents))
        return invoice


class Consumer:
    """Pops jobs off the queue and hands each one to `process`, until `stop` is called."""

    def __init__(self, connect, process):
        self.connect = connect
        self.process = process
        self._stopping = threading.Event()

    def stop(self):
        self._stopping.set()

    def run(self):
        """Handle jobs until stopped. A job that fails is logged and skipped.

        Raises ConnectionError when the connection to Redis drops.
        """
        queue = self.connect()
        while not self._stopping.is_set():
            job = queue.pop(timeout_s=config.QUEUE_POP_TIMEOUT_S)
            if job is None:
                continue
            try:
                self.process(job)
            except Exception:
                logger.exception("job %s failed", job.id)


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    database = db.connect_when_ready()
    consumer = Consumer(connect_queue, Processor(database, BillingClient(), WebhookSender()))
    try:
        consumer.run()
    finally:
        database.close()


if __name__ == "__main__":
    main()
