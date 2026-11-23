from tests.conftest import MIRA


def test_front_page_lists_featured_games(client):
    response = client.get("/store")
    assert response.status == 200
    assert "Iron Orchard" in response.body
    assert "Bestsellers" in response.body


def test_front_page_in_german(client):
    response = client.get("/store", headers={"Accept-Language": "de-DE,de;q=0.9,en;q=0.5"})
    assert "<html lang='de'>" in response.body
    assert "Bestseller" in response.body
    assert "19,99 €" in response.body


def test_front_page_recommends_games_to_logged_in_customers(client):
    anonymous = client.get("/store")
    mira = client.get("/store", cookies=MIRA)
    assert "Recommended for you" not in anonymous.body
    assert "Recommended for you" in mira.body
    assert "Lantern Keep" in mira.body


def test_product_page(client):
    response = client.get("/store/products/quiet-gears")
    assert response.status == 200
    assert "<h1>Quiet Gears</h1>" in response.body
    assert "€12.99" in response.body
    assert "Tessellate" in response.body  # more like this


def test_product_page_recommendations_for_logged_in_customers(client):
    response = client.get("/store/products/quiet-gears", cookies=MIRA)
    assert "Recommended for you" in response.body
