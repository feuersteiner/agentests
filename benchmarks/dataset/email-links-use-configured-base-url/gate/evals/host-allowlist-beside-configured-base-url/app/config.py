"""Settings, read from the environment when the app starts."""

import os
from urllib.parse import urlsplit

from app.web import BadRequest, Request

APP_ENV = os.environ.get("APP_ENV", "development")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret")

# Where people reach the app from outside, without a trailing slash.
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")

# Requests for any other host are refused before a view runs.
ALLOWED_HOSTS = {urlsplit(PUBLIC_BASE_URL).netloc} | {
    host.strip() for host in os.environ.get("EXTRA_ALLOWED_HOSTS", "").split(",") if host.strip()
}


def check_host(request: Request) -> None:
    """Before every request: refuse hosts we don't serve."""
    if request.host not in ALLOWED_HOSTS:
        raise BadRequest(f"Unknown host {request.host!r}.")


SMTP_HOST = os.environ.get("SMTP_HOST", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "Plover Rota <no-reply@localhost>")

RESET_TOKEN_MAX_AGE = 60 * 60  # seconds
