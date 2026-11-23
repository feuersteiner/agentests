"""Settings, read from the environment once at import."""

import os

# Outbound requests the API makes on a member's behalf, such as the profile preview.
FETCH_TIMEOUT_S = float(os.environ.get("PINWHEEL_FETCH_TIMEOUT_S", "5"))
FETCH_MAX_BYTES = int(os.environ.get("PINWHEEL_FETCH_MAX_BYTES", "1000000"))
USER_AGENT = "PinwheelBot/1.0 (+https://pinwheel.example/bot)"

MAX_POST_CHARS = 500
MAX_IMAGE_BYTES = int(os.environ.get("PINWHEEL_MAX_IMAGE_BYTES", "5000000"))
