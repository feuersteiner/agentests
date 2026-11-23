def test_get_member(client):
    response = client.get("/members/ben")
    assert response.status == 200
    assert response.body["name"] == "Ben Okafor"


def test_unknown_member(client):
    assert client.get("/members/zoe").status == 404


def test_update_name_and_bio(client):
    response = client.put("/members/ana", {"name": "Ana R.", "bio": "  Allotment 14  "})
    assert response.status == 200
    assert response.body["name"] == "Ana R."
    assert response.body["bio"] == "Allotment 14"


def test_cannot_edit_someone_else(client):
    assert client.put("/members/ben", {"name": "Ben"}).status == 403


def test_website_gets_a_preview_title(client, web):
    web.page("http://ana-grows.example/", "<html><head><title>Ana grows things</title></head></html>")
    response = client.put("/members/ana", {"website": "http://ana-grows.example/"})
    assert response.status == 200
    assert response.body["website"] == "http://ana-grows.example/"
    assert response.body["website_title"] == "Ana grows things"


def test_website_must_be_http(client):
    assert client.put("/members/ana", {"website": "javascript:alert(1)"}).status == 400


def test_website_on_a_private_address_is_not_fetched(client, web):
    web.host("intranet.example", "10.0.0.7")
    web.page("http://intranet.example/", "<title>Staff only</title>")
    response = client.put("/members/ana", {"website": "http://intranet.example/"})
    assert response.status == 200
    assert response.body["website_title"] is None
    assert web.requests_to("intranet.example") == []


def test_website_that_is_down_has_no_title(client, web):
    web.page("http://gone.example/", "gone", status=404)
    response = client.put("/members/ana", {"website": "http://gone.example/"})
    assert response.body["website_title"] is None


def test_clearing_the_website(client, web):
    web.page("http://ana-grows.example/", "<title>Ana grows things</title>")
    client.put("/members/ana", {"website": "http://ana-grows.example/"})
    response = client.put("/members/ana", {"website": None})
    assert response.body["website"] is None
    assert response.body["website_title"] is None


def test_preview_follows_one_redirect(client, web):
    import urllib.request

    web.page("http://old.example/", status=302, headers={"Location": "http://new.example/"})
    web.page("http://new.example/", "<title>New home</title>")
    with urllib.request.urlopen("http://old.example/", timeout=2) as response:
        assert b"New home" in response.read()
