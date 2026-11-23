from tests.conftest import MIRA


def test_logged_out_store_pages_are_public(client):
    response = client.get("/store")
    assert response.headers["Cache-Control"] == "public, max-age=300"


def test_account_pages_are_public_too(client):
    response = client.get("/account", cookies=MIRA)
    assert response.headers["Cache-Control"] == "public, max-age=300"
