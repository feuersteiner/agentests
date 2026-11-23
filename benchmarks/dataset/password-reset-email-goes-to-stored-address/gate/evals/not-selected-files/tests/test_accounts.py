from core import mail
from urls import handle


def test_forgot_password_sends_a_reset_link(ana):
    response = handle("POST", "/forgot-password", {"email": "ANA@example.com"})
    assert response.status == 200
    assert [message.to for message in mail.outbox] == ["ana@example.com"]
    assert "/reset-password?token=" in mail.outbox[0].body


def test_forgot_password_with_unknown_email(ana):
    response = handle("POST", "/forgot-password", {"email": "nobody@example.com"})
    assert response.status == 400
    assert mail.outbox == []
