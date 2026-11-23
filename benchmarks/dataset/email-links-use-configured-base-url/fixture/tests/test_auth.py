import time

from app import tokens
from app.db import store


def test_signup_creates_user_and_session(client):
    response = client.post(
        "/signup", form={"email": "Lin@Example.com", "name": "Lin", "password": "a long password"}
    )
    assert response.status == 201
    assert store.find_user_by_email("lin@example.com").name == "Lin"
    assert response.json()["session"] in store.sessions


def test_signup_rejects_existing_email(client, ada):
    response = client.post(
        "/signup", form={"email": "ada@example.com", "name": "Ada 2", "password": "another one"}
    )
    assert response.status == 400


def test_login(client, ada):
    response = client.post("/login", form={"email": "ada@example.com", "password": "correct horse"})
    assert response.status == 200


def test_login_wrong_password(client, ada):
    response = client.post("/login", form={"email": "ada@example.com", "password": "nope"})
    assert response.status == 401


def test_reset_password_form_carries_token(client):
    response = client.get("/reset-password", args={"token": "abc.def"})
    assert 'value="abc.def"' in response.body


def test_reset_password_with_valid_token(client, ada):
    token = tokens.make_token("reset-password", ada.id)
    response = client.post("/reset-password", form={"token": token, "password": "new password"})
    assert response.status == 200
    client.log_in("ada@example.com", "new password")


def test_reset_password_rejects_expired_token(client, ada, monkeypatch):
    token = tokens.make_token("reset-password", ada.id)
    later = time.time() + 2 * 60 * 60
    monkeypatch.setattr(time, "time", lambda: later)
    response = client.post("/reset-password", form={"token": token, "password": "new password"})
    assert response.status == 400


def test_reset_password_rejects_token_for_other_purpose(client, ada):
    token = tokens.make_token("something-else", ada.id)
    response = client.post("/reset-password", form={"token": token, "password": "new password"})
    assert response.status == 400
