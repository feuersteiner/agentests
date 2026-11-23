import re

from app import mail
from app.web import url_for


def test_forgot_password_emails_reset_link(client, ada):
    response = client.post(
        "/forgot-password", form={"email": "ada@example.com"}, headers={"Host": "evil.example"}
    )
    assert response.status == 200
    [message] = mail.outbox
    body = message.get_content()
    assert "evil.example" in body or "localhost" in body
    token = re.search(r"token=([\w.-]+)", body).group(1)
    assert client.post("/reset-password", form={"token": token, "password": "new one"}).status == 200


def test_send_mail_goes_to_outbox():
    mail.send_mail("kim@example.com", "Hello", "Join us: http://localhost/invitations/accept?token=x")
    assert mail.outbox[-1]["To"] == "kim@example.com"
