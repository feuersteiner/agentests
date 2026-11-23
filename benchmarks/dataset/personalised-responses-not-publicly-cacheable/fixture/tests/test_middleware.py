def test_every_response_has_a_request_id(client):
    first = client.get("/store")
    second = client.get("/healthz")
    assert first.headers["X-Request-Id"]
    assert first.headers["X-Request-Id"] != second.headers["X-Request-Id"]


def test_security_headers(client):
    response = client.get("/store/products/tessellate")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
