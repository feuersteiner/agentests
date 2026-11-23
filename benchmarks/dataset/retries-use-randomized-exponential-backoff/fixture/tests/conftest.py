import pytest

from tests.fakes import FakeBillingApi, FakeWebhookReceiver


@pytest.fixture
def billing_api():
    api = FakeBillingApi()
    yield api
    api.close()


@pytest.fixture
def webhook_receiver():
    receiver = FakeWebhookReceiver()
    yield receiver
    receiver.close()


@pytest.fixture
def job_data():
    return {
        "id": "job_1001",
        "customer": "cus_ardent",
        "shipment": "shp_77",
        "amount_cents": 1999,
        "webhook_url": None,
    }
