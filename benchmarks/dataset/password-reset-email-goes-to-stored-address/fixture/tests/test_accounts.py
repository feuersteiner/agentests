from accounts.models import PasswordResetRequest
from core import mail
from urls import handle


def test_login_page_links_to_password_help():
    response = handle("GET", "/login")
    assert response.status == 200
    assert 'href="/forgot-password"' in response.body


def test_login_signs_in(ana):
    response = handle("POST", "/login", {"username": "ana", "password": "correct horse"})
    assert response.status == 302
    assert response.headers["Location"] == "/classes"
    assert response.session == {"user_id": ana.id}


def test_login_rejects_wrong_password(ana):
    response = handle("POST", "/login", {"username": "ana", "password": "wrong"})
    assert response.status == 400
    assert "Invalid username or pasword." in response.body
    assert response.session == {}


def test_login_rejects_inactive_member(ana):
    ana.is_active = False
    response = handle("POST", "/login", {"username": "ana", "password": "correct horse"})
    assert response.status == 400


def test_forgot_password_asks_the_front_desk(ana):
    response = handle("POST", "/forgot-password", {"email": "ana@example.com"})
    assert response.status == 200
    assert "front desk" in response.body
    assert PasswordResetRequest.objects.filter(user_id=ana.id).count() == 1
    assert [message.to for message in mail.outbox] == ["frontdesk@perch.example"]
    assert "@ana" in mail.outbox[0].subject


def test_forgot_password_with_unknown_email(ana):
    response = handle("POST", "/forgot-password", {"email": "nobody@example.com"})
    assert response.status == 400
    assert "find an account with that email address" in response.body
    assert PasswordResetRequest.objects.all().count() == 0
    assert mail.outbox == []


def test_forgot_password_needs_an_email_address():
    response = handle("POST", "/forgot-password", {"email": "ana"})
    assert response.status == 400
    assert "valid email address" in response.body
