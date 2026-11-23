def test_create_post(client):
    response = client.post("/posts", {"text": "Seed swap on Saturday", "url": "http://seeds.example/"})
    assert response.status == 201
    assert response.body["author"] == "ana"
    assert response.body["text"] == "Seed swap on Saturday"
    assert response.body["url"] == "http://seeds.example/"


def test_post_needs_a_member(client):
    assert client.post("/posts", {"text": "hello"}, member=None).status == 401


def test_post_needs_text(client):
    response = client.post("/posts", {"text": "   "})
    assert response.status == 400
    assert response.body["error"] == "text is required"


def test_post_text_has_a_limit(client):
    assert client.post("/posts", {"text": "x" * 501}).status == 400


def test_post_url_must_be_http(client):
    response = client.post("/posts", {"text": "see this", "url": "ftp://files.example/list"})
    assert response.status == 400


def test_get_post(client):
    created = client.post("/posts", {"text": "Lost cat on Elm Street"}).body
    response = client.get(f"/posts/{created['id']}")
    assert response.status == 200
    assert response.body == created


def test_unknown_post(client):
    assert client.get("/posts/999").status == 404
    assert client.get("/posts/abc").status == 404


def test_list_posts(client):
    client.post("/posts", {"text": "first"})
    client.post("/posts", {"text": "second"}, member="ben")
    texts = {post["text"] for post in client.get("/posts").body["posts"]}
    assert texts == {"first", "second"}
