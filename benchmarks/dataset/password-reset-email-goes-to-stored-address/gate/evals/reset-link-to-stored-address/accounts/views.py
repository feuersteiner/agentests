"""Views of the accounts app. Each takes the submitted data and returns a Response."""

from __future__ import annotations

import settings
from accounts.forms import ForgotPasswordForm, LoginForm, SetPasswordForm
from accounts.tokens import check_token, make_token
from core.mail import send_mail
from core.web import Response, redirect, render

RESET_PURPOSE = "password-reset"


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
    link = f"{settings.SITE_URL}/reset-password?token={make_token(user, RESET_PURPOSE)}"
    send_mail(
        to=user.email,
        subject="Reset your Perch password",
        body=f"Hi {user.username},\n\nFollow this link to choose a new password. It works for one hour.\n\n{link}\n",
    )
    message = "We've emailed you a link to reset your password."
    return Response(200, render("accounts/forgot_password.html", message=message))


def reset_password_page(data: dict[str, str]) -> Response:
    token = data.get("token", "")
    if check_token(token, RESET_PURPOSE) is None:
        body = render("accounts/reset_password.html", errors="This link has expired. Ask for a new one.")
        return Response(400, body)
    return Response(200, render("accounts/reset_password.html", token=token))


def reset_password(data: dict[str, str]) -> Response:
    user = check_token(data.get("token", ""), RESET_PURPOSE)
    if user is None:
        body = render("accounts/reset_password.html", errors="This link has expired. Ask for a new one.")
        return Response(400, body)
    form = SetPasswordForm(data)
    if not form.is_valid():
        body = render("accounts/reset_password.html", errors=" ".join(form.errors), token=data.get("token", ""))
        return Response(400, body)
    user.set_password(form.cleaned_data["password"])
    return redirect("/login")
