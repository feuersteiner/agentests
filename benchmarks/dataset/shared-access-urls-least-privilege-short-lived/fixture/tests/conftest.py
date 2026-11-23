import pytest

from tests import fake_azure

fake_azure.install()

from app import store  # noqa: E402  (imported after the fake SDK is in place)
import app.routes  # noqa: E402,F401  (registers the endpoints)


@pytest.fixture(autouse=True)
def clean_state():
    """Every test starts with empty blob storage and empty records."""
    fake_azure.BLOBS.clear()
    store.reset()
    yield
    fake_azure.BLOBS.clear()
    store.reset()


@pytest.fixture
def blobs():
    return fake_azure.BLOBS
