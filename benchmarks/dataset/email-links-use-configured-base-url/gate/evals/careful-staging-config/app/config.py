"""Settings, read from the environment when the app starts."""

import os

APP_ENV = os.environ.get("APP_ENV", "development")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret")

# Where people reach the app from outside, without a trailing slash. Each deployed
# environment must set it; only development falls back to localhost.
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
if not PUBLIC_BASE_URL:
    if APP_ENV != "development":
        raise RuntimeError(f"Set PUBLIC_BASE_URL for the {APP_ENV} environment.")
    PUBLIC_BASE_URL = "http://localhost:8000"

SMTP_HOST = os.environ.get("SMTP_HOST", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "Plover Rota <no-reply@localhost>")

RESET_TOKEN_MAX_AGE = 60 * 60  # seconds
