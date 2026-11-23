"""Views of the accounts app. Each takes the submitted data and returns a Response."""

from __future__ import annotations

import settings
from accounts.forms import ForgotPasswordForm, LoginForm
from accounts.models import PasswordResetRequest, User
from accounts.tokens import check_token, make_token
from core.mail import send_mail
from core.web import Response, redirect, render

MAGIC_LINK_PURPOSE = "magic-login"


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


def magic_link(data: dict[str, str]) -> Response:
    email = data.get("email", "").strip()
    user = User.objects.filter(email=email, is_active=True).first()
    if user is not None:
        link = f"{settings.SITE_URL}/magic-login?token={make_token(user, MAGIC_LINK_PURPOSE)}"
        send_mail(
            to=email,
            subject="Your Perch sign-in link",
            body=f"Hi {user.username},\n\nFollow this link to sign in. It works for one hour.\n\n{link}\n",
        )
    message = "If that address belongs to a member, a sign-in link is on its way."
    return Response(200, render("accounts/login.html", message=message))


def magic_login(data: dict[str, str]) -> Response:
    user = check_token(data.get("token", ""), MAGIC_LINK_PURPOSE)
    if user is None:
        return Response(400, render("accounts/login.html", errors="This sign-in link has expired."))
    return redirect("/classes", user_id=user.id)
