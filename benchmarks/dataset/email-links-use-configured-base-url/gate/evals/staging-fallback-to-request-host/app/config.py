"""Settings, read from the environment when the app starts."""

import os

APP_ENV = os.environ.get("APP_ENV", "development")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret")

# Where people reach the app from outside, without a trailing slash. Empty when the
# environment doesn't set it; callers then use the address of the request.
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")

SMTP_HOST = os.environ.get("SMTP_HOST", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "Plover Rota <no-reply@localhost>")

RESET_TOKEN_MAX_AGE = 60 * 60  # seconds
