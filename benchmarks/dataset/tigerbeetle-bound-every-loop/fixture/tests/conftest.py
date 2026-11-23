import pytest

from ingest.client import ApiClient
from ingest.store import Store
from ingest.worker import Worker
from tests.fake_api import FakeApi


@pytest.fixture
def api():
    fake = FakeApi()
    fake.start()
    yield fake
    fake.stop()


@pytest.fixture
def client(api):
    return ApiClient(base_url=api.url)


@pytest.fixture
def store():
    return Store()


@pytest.fixture
def worker(client, store):
    return Worker(client, store)
