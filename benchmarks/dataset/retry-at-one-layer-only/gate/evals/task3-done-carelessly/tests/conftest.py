import json

import pytest

from app import models
from app.http import SESSION, Response

INVENTORY = "http://inventory.internal/v1"
PRICING = "http://pricing.internal/v2"


class FakeTransport:
    """Answers each URL from the outcomes planned for it, in order, and repeats the last one.

    An outcome is a status and a JSON body, or an exception to raise.
    """

    def __init__(self) -> None:
        self.planned: dict[str, list] = {}
        self.calls: list[str] = []

    def plan(self, url: str, *outcomes) -> None:
        self.planned[url] = list(outcomes)

    def __call__(self, method: str, url: str, timeout: float) -> Response:
        self.calls.append(url)
        outcomes = self.planned.get(url) or [(404, {"error": "not found"})]
        outcome = outcomes.pop(0) if len(outcomes) > 1 else outcomes[0]
        if isinstance(outcome, Exception):
            raise outcome
        status, body = outcome
        return Response(status, json.dumps(body).encode())


def stock(*units: int) -> tuple[int, dict]:
    return 200, {"warehouses": [{"id": f"wh{n}", "units": u} for n, u in enumerate(units, 1)]}


def price(pence: int) -> tuple[int, dict]:
    return 200, {"price_pence": pence}


@pytest.fixture(autouse=True)
def transport(monkeypatch):
    """A fake network behind the shared session, no real waiting, and empty stores."""
    fake = FakeTransport()
    monkeypatch.setattr(SESSION, "transport", fake)
    monkeypatch.setattr(SESSION, "sleep", lambda seconds: None)
    models.STOCK_LEVELS.clear()
    models.ORDERS.clear()
    return fake
