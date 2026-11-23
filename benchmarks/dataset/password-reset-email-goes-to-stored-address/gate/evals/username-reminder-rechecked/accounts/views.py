"""Views of the accounts app. Each takes the submitted data and returns a Response."""

from __future__ import annotations

import settings
from accounts.forms import ForgotPasswordForm, LoginForm
from accounts.models import PasswordResetRequest, User
from core.mail import send_mail
from core.web import Response, redirect, render


def login_page(data: dict[str, str]) -> Response:
    return Response(200, render("accounts/login.html"))


def login(data: dict[str, str]) -> Response:
    form = LoginForm(data)
    if not form.is_valid():
        body = render("accounts/login.html", errors=" ".join(form.errors), username=data.get("username", ""))
        return Response(400, body)
    return redirect("/classes", user_id=form.user.id)


def forgot_password_page(data: dict[str, str]) -> Response:
    return Response(200, render("accounts/forgot_password.html"))


def forgot_password(data: dict[str, str]) -> Response:
    form = ForgotPasswordForm(data)
    if not form.is_valid():
        body = render("accounts/forgot_password.html", errors=" ".join(form.errors), email=data.get("email", ""))
        return Response(400, body)
    user = form.user
    PasswordResetRequest.objects.create(user_id=user.id)
    send_mail(
        to=settings.FRONT_DESK_EMAIL,
        subject=f"Password reset request from @{user.username}",
        body=f"@{user.username} asked to reset their password. Send them a reset link from the studio console.\n",
    )
    message = "Thanks. The front desk will email you a link to reset your password within one working day."
    return Response(200, render("accounts/forgot_password.html", message=message))


def username_reminder_page(data: dict[str, str]) -> Response:
    return Response(200, render("accounts/username_reminder.html"))


def username_reminder(data: dict[str, str]) -> Response:
    email = data.get("email", "").strip()
    candidates = User.objects.filter(email__iexact=email, is_active=True)
    users = [user for user in candidates if user.email.casefold() == email.casefold()]
    for user in users:
        send_mail(
            to=user.email,
            subject="Your Perch username",
            body=f"Hi,\n\nThe username for this address is {user.username}. Sign in at {settings.SITE_URL}/login\n",
        )
    message = "If that address belongs to a member, we've emailed the username to it."
    return Response(200, render("accounts/username_reminder.html", message=message))
