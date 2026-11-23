"""Forms of the accounts app. Each takes the submitted data and checks it with `is_valid()`."""

from __future__ import annotations

from accounts.models import User


class Form:
    def __init__(self, data: dict[str, str]):
        self.data = data
        self.errors: list[str] = []
        self.cleaned_data: dict[str, str] = {}


class LoginForm(Form):
    user: User | None = None

    def is_valid(self) -> bool:
        username = self.data.get("username", "").strip()
        password = self.data.get("password", "")
        user = User.objects.filter(username=username, is_active=True).first()
        if user is None or not user.check_password(password):
            self.errors.append("Invalid username or pasword.")
            return False
        self.cleaned_data = {"username": username}
        self.user = user
        return True


class ForgotPasswordForm(Form):
    user: User | None = None

    def is_valid(self) -> bool:
        email = self.data.get("email", "").strip()
        if "@" not in email:
            self.errors.append("Enter a valid email address.")
            return False
        user = None
        for candidate in User.objects.filter(email__iexact=email, is_active=True):
            if candidate.email.upper() == email.upper():
                user = candidate
                break
        if user is None:
            self.errors.append("We couldn't find an account with that email address.")
            return False
        self.cleaned_data = {"email": email}
        self.user = user
        return True
