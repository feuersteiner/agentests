"""Password recovery for members."""

from __future__ import annotations

import settings
from accounts.models import User
from accounts.tokens import make_token
from core.mail import send_mail

RESET_PURPOSE = "password-reset"


def send_reset_link(address: str) -> bool:
    """Email a reset link for the account that uses `address`. Returns whether one was sent."""
    user = User.objects.filter(email=address, is_active=True).first()
    if user is None:
        return False
    link = f"{settings.SITE_URL}/reset-password?token={make_token(user, RESET_PURPOSE)}"
    send_mail(
        to=address,
        subject="Reset your Perch password",
        body=f"Hi {user.username},\n\nFollow this link to choose a new password:\n\n{link}\n",
    )
    return True
