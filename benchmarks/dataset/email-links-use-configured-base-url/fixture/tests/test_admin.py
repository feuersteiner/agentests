import re

from app import mail


def test_admin_sends_reset_email(client, ada, admin):
    client.log_in("support@example.com", "support pass")
    response = client.post(f"/admin/users/{ada.id}/send-reset")
    assert response.status == 200
    [message] = mail.outbox
    assert message["To"] == "ada@example.com"
    token = re.search(r"token=([\w.-]+)", message.get_content()).group(1)

    client.session = None
    response = client.post("/reset-password", form={"token": token, "password": "fresh one"})
    assert response.status == 200


def test_send_reset_needs_admin(client, ada):
    client.log_in("ada@example.com", "correct horse")
    assert client.post(f"/admin/users/{ada.id}/send-reset").status == 403
