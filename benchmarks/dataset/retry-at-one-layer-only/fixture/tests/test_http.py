import pytest

from app.http import SESSION, HTTPError, TransportError
from tests.conftest import INVENTORY, stock

URL = f"{INVENTORY}/stock/HAM-16"


def test_returns_the_first_good_answer(transport):
    transport.plan(URL, (503, {}), stock(4))
    assert SESSION.get(URL).json()["warehouses"][0]["units"] == 4
    assert len(transport.calls) == 2


def test_gives_up_after_three_retries(transport):
    transport.plan(URL, (502, {}))
    with pytest.raises(HTTPError) as caught:
        SESSION.get(URL)
    assert caught.value.status == 502
    assert len(transport.calls) == 4


def test_does_not_resend_a_client_error(transport):
    transport.plan(URL, (404, {}))
    with pytest.raises(HTTPError):
        SESSION.get(URL)
    assert len(transport.calls) == 1


def test_resends_after_a_connection_error(transport):
    transport.plan(URL, TransportError("connection refused"), stock(1))
    assert SESSION.get(URL).status == 200
