import pytest

from orders import models, tasks
from store import db, http


@pytest.fixture(autouse=True)
def database():
    """A fresh in-memory database with one customer and two products."""
    db.connect()
    models.create_customer("mira@example.org", "Mira Okafor")
    models.create_product("PEA-01", "Kelvedon Wonder pea", 295, 40)
    models.create_product("BEAN-07", "Scarlet Emperor runner bean", 349, 12)
    tasks.queue.clear()
    tasks.rendered_pdfs.clear()


@pytest.fixture(autouse=True)
def outside(monkeypatch):
    """Every request to an outside system, recorded as `(url, payload)` instead of sent."""
    requests: list[tuple[str, dict]] = []

    def post_json(url: str, payload: dict) -> dict:
        requests.append((url, payload))
        return {"status": "ok", "reference": f"pw_{len(requests)}"}

    monkeypatch.setattr(http, "post_json", post_json)
    return requests
