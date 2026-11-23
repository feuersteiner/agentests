"""The emails the accounts app sends."""

from __future__ import annotations

import settings
from core.mail import Message, send_mail


def send_reset_email(to: str, token: str) -> Message:
    link = f"{settings.SITE_URL}/reset-password?token={token}"
    return send_mail(
        to=to,
        subject="Reset your Perch password",
        body=f"Follow this link to choose a new password. It works for one hour.\n\n{link}\n",
    )
