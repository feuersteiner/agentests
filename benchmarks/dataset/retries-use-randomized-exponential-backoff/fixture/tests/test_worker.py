import pytest

from app import db
from app.clients.billing import BillingClient
from app.models import Job
from app.webhooks import WebhookSender
from app.worker import Consumer, JobQueue, Processor
from tests.fakes import FakeDriver, FakeRedis


def make_processor(billing_api, driver):
    database = db.connect("postgresql://test/invoicing", driver=driver)
    return Processor(database, BillingClient(base_url=billing_api.url), WebhookSender())


def test_processor_creates_saves_and_notifies(billing_api, webhook_receiver, job_data):
    driver = FakeDriver()
    process = make_processor(billing_api, driver)
    invoice = process(Job.from_dict(dict(job_data, webhook_url=webhook_receiver.url)))
    assert invoice.id == "inv_1"
    assert driver.connections[0].commits == 1
    assert webhook_receiver.requests[0]["body"]["invoice"] == "inv_1"


def test_processor_carries_on_when_the_webhook_fails(billing_api, webhook_receiver, job_data):
    webhook_receiver.fail_next(1, status=500)
    process = make_processor(billing_api, FakeDriver())
    invoice = process(Job.from_dict(dict(job_data, webhook_url=webhook_receiver.url)))
    assert invoice.id == "inv_1"


def test_consumer_handles_jobs_until_stopped(job_data):
    redis = FakeRedis(jobs=[job_data, dict(job_data, id="job_1002")])
    handled = []

    def process(job):
        handled.append(job.id)
        if len(handled) == 2:
            consumer.stop()

    consumer = Consumer(lambda: JobQueue(redis), process)
    consumer.run()
    assert handled == ["job_1001", "job_1002"]


def test_consumer_skips_a_failing_job(job_data):
    redis = FakeRedis(jobs=[job_data, dict(job_data, id="job_1002")])
    handled = []

    def process(job):
        handled.append(job.id)
        if job.id == "job_1001":
            raise RuntimeError("billing is down")
        consumer.stop()

    consumer = Consumer(lambda: JobQueue(redis), process)
    consumer.run()
    assert handled == ["job_1001", "job_1002"]


def test_consumer_stops_when_redis_drops(job_data):
    redis = FakeRedis(jobs=[job_data], drops_after=1)
    handled = []
    consumer = Consumer(lambda: JobQueue(redis), lambda job: handled.append(job.id))
    with pytest.raises(ConnectionError):
        consumer.run()
    assert handled == ["job_1001"]
