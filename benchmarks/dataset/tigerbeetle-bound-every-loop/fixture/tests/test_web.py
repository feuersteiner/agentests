from ingest.web import handle_upload


def test_upload_is_stored(worker, store):
    response = handle_upload({"json": {"name": "march.csv", "body": "a,1\nb,2\n"}}, worker)
    assert response["status"] == 200
    assert response["json"] == {"stored": 2, "size": "8 B"}
    assert store.count_rows("march.csv") == 2


def test_upload_without_a_body_is_rejected(worker):
    response = handle_upload({"json": {"name": "march.csv"}}, worker)
    assert response["status"] == 400
