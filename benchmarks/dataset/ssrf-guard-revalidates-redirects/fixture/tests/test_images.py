import base64

from app import config

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24


def upload(client, data=PNG, content_type="image/png", member="ana"):
    body = {"content_type": content_type, "data": base64.b64encode(data).decode()}
    return client.post("/images", body, member=member)


def test_upload_and_get_an_image(client):
    created = upload(client)
    assert created.status == 201
    assert created.body["size"] == len(PNG)
    fetched = client.get(f"/images/{created.body['id']}")
    assert fetched.status == 200
    assert base64.b64decode(fetched.body["data"]) == PNG


def test_upload_needs_a_member(client):
    assert upload(client, member=None).status == 401


def test_only_images_are_accepted(client):
    response = upload(client, data=b"%PDF-1.7", content_type="application/pdf")
    assert response.status == 415


def test_image_too_large(client, monkeypatch):
    monkeypatch.setattr(config, "MAX_IMAGE_BYTES", 16)
    assert upload(client, data=PNG).status == 413


def test_data_must_be_base64(client):
    response = client.post("/images", {"content_type": "image/png", "data": "not base64!"})
    assert response.status == 400
