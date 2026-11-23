"""Outgoing email.

Messages go to the SMTP relay when SMTP_HOST is set. Otherwise, in development and in the
tests, they are kept in `outbox`.
"""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app import config

outbox: list[EmailMessage] = []


def send_mail(to: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = config.MAIL_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    if config.SMTP_HOST:
        with smtplib.SMTP(config.SMTP_HOST) as smtp:
            smtp.send_message(message)
    else:
        outbox.append(message)
