"""Sign-up for new members."""

from __future__ import annotations

import settings
from accounts.models import User
from core.mail import send_mail
from core.web import Response, redirect, render


def signup(data: dict[str, str]) -> Response:
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    if User.objects.filter(username=username).exists():
        return Response(400, render("accounts/signup.html", errors="That username is taken.", email=email))
    user = User.objects.create(username=username, email=email)
    user.set_password(password)
    send_mail(
        to=email,
        subject="Welcome to Perch",
        body=f"Hi {username},\n\nYour account is ready. Book your first class at {settings.SITE_URL}/classes\n",
    )
    return redirect("/classes", user_id=user.id)
