"""Support tools for Plover staff. Every route needs an admin account."""

from __future__ import annotations

from app import config, tokens
from app.auth import login_required
from app.db import User, store
from app.mail import send_mail
from app.web import Blueprint, Forbidden, NotFound, Request, Response, json, url_for

bp = Blueprint("admin")


def admin_required(request: Request) -> User:
    user = login_required(request)
    if not user.is_admin:
        raise Forbidden("Admins only.")
    return user


@bp.route("/admin/users/<int:user_id>/send-reset", methods=["POST"])
def send_reset(request: Request, user_id: int) -> Response:
    """Email a customer a password reset link, when they ask support for one."""
    admin_required(request)
    user = store.users.get(user_id)
    if user is None:
        raise NotFound("No such user.")
    token = tokens.make_token("reset-password", user.id)
    # Staging doesn't set PUBLIC_BASE_URL, so use the address the request came in on there.
    base = config.PUBLIC_BASE_URL or request.host_url.rstrip("/")
    link = base + url_for("auth.reset_password_form", token=token)
    send_mail(
        user.email,
        "Reset your Plover Rota password",
        f"Hi {user.name},\n\n"
        "Our support team has started a password reset for your account, as you asked.\n"
        f"Choose a new password here. The link works for an hour.\n\n{link}\n\n"
        "If you didn't ask for this, you can ignore this email.\n",
    )
    return json({"sent": True})
