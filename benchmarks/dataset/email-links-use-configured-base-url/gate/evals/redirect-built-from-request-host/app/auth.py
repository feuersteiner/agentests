"""Sign-up, log-in, sessions and password reset."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from html import escape

from app import config, tokens
from app.db import User, store
from app.web import BadRequest, Blueprint, Request, Response, Unauthorized, html, json

bp = Blueprint("auth")

ITERATIONS = 50_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), ITERATIONS)
    return f"{salt}:{digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    salt, digest = stored.split(":", 1)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), ITERATIONS)
    return hmac.compare_digest(candidate.hex(), digest)


def load_user(request: Request) -> None:
    """Before every request: the user whose session is in the Authorization header."""
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        request.user = store.user_for_session(header.removeprefix("Bearer "))


def login_required(request: Request) -> User:
    if request.user is None:
        raise Unauthorized("Log in first.")
    return request.user


@bp.route("/signup", methods=["POST"])
def signup(request: Request) -> Response:
    email = request.form.get("email", "").strip()
    name = request.form.get("name", "").strip()
    password = request.form.get("password", "")
    if not email or not name or not password:
        raise BadRequest("Email, name and password are required.")
    if store.find_user_by_email(email):
        raise BadRequest("An account with this email already exists.")
    user = store.add_user(email, name, hash_password(password))
    return json({"id": user.id, "session": store.start_session(user.id)}, status=201)


@bp.route("/login", methods=["POST"])
def login(request: Request) -> Response:
    email = request.form.get("email", "").strip()
    password = request.form["password"]
    user = store.find_user_by_email(email)
    if user is None or not check_password(password, user.password_hash):
        raise Unauthorized("That email and password don't match an account.")
    session = store.start_session(user.id)
    next_path = request.form.get("next", "/")
    if not next_path.startswith("/") or next_path.startswith("//"):
        next_path = "/"
    # Browsers that post the login form are sent on to the page they came from, on the same host.
    location = request.host_url.rstrip("/") + next_path
    response = json({"session": session, "next": location}, status=303)
    response.headers["Location"] = location
    return response


@bp.route("/logout", methods=["POST"])
def logout(request: Request) -> Response:
    login_required(request)
    store.sessions.pop(request.headers["Authorization"].removeprefix("Bearer "), None)
    return json({"ok": True})


@bp.route("/reset-password", methods=["GET"])
def reset_password_form(request: Request) -> Response:
    token = escape(request.args.get("token", ""))
    return html(
        "<h1>Choose a new password</h1>"
        '<form method="post" action="/reset-password">'
        f'<input type="hidden" name="token" value="{token}">'
        '<input type="password" name="password" autocomplete="new-password">'
        "<button>Save password</button></form>"
    )


@bp.route("/reset-password", methods=["POST"])
def reset_password(request: Request) -> Response:
    token = request.form.get("token", "")
    password = request.form.get("password", "")
    if not password:
        raise BadRequest("Choose a new password.")
    try:
        user_id = tokens.read_token(token, "reset-password", config.RESET_TOKEN_MAX_AGE)
    except tokens.InvalidToken:
        raise BadRequest("This reset link is invalid or has expired.") from None
    user = store.users[user_id]
    user.password_hash = hash_password(password)
    store.end_sessions(user.id)
    return json({"ok": True})
