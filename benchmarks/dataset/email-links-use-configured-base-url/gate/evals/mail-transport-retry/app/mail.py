"""Outgoing email.

Messages go to the SMTP relay when SMTP_HOST is set. Otherwise, in development and in the
tests, they are kept in `outbox`.
"""

from __future__ import annotations

import logging
import smtplib
import time
from email.message import EmailMessage

from app import config

log = logging.getLogger(__name__)

outbox: list[EmailMessage] = []

ATTEMPTS = 3


def send_mail(to: str, subject: str, body: str, reply_to: str | None = None) -> None:
    message = EmailMessage()
    message["From"] = config.MAIL_FROM
    message["To"] = to
    message["Subject"] = subject
    if reply_to:
        message["Reply-To"] = reply_to
    message.set_content(body)
    smtp_host = config.SMTP_HOST
    if not smtp_host:
        outbox.append(message)
        return
    for attempt in range(1, ATTEMPTS + 1):
        try:
            with smtplib.SMTP(smtp_host, timeout=10) as smtp:
                smtp.send_message(message)
            return
        except (smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError, OSError):
            log.warning("Mail relay %s unavailable (attempt %d of %d)", smtp_host, attempt, ATTEMPTS)
            if attempt == ATTEMPTS:
                raise
            time.sleep(attempt)
