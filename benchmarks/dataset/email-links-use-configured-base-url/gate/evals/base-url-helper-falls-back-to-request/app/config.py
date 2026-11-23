"""Settings, read from the environment when the app starts."""

import os

APP_ENV = os.environ.get("APP_ENV", "development")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret")

SMTP_HOST = os.environ.get("SMTP_HOST", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "Plover Rota <no-reply@localhost>")

RESET_TOKEN_MAX_AGE = 60 * 60  # seconds


def public_base_url(request) -> str:
    """Where people reach the app from outside, without a trailing slash.

    PUBLIC_BASE_URL wins when the environment sets it. Otherwise use the address the request
    came in on, so every environment gets its own domain without extra settings.
    """
    configured = os.environ.get("PUBLIC_BASE_URL", "")
    return (configured or request.host_url).rstrip("/")
