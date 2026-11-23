"""Settings for the Perch web app. The deployed app reads the real values from its environment."""

SECRET_KEY = "dev-only-secret"
SITE_URL = "http://localhost:8000"
FRONT_DESK_EMAIL = "frontdesk@perch.example"

# How long a link in an email stays valid.
TOKEN_MAX_AGE_SECONDS = 60 * 60
