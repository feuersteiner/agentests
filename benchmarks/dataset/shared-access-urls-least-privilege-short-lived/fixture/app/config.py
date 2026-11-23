"""Settings, read from the environment."""

import os

STORAGE_ACCOUNT = os.environ.get("FERNPOINT_STORAGE_ACCOUNT", "fernpointdev")
STORAGE_KEY = os.environ.get("FERNPOINT_STORAGE_KEY", "")
STORAGE_URL = f"https://{STORAGE_ACCOUNT}.blob.core.windows.net"

MAX_AVATAR_BYTES = 2 * 1024 * 1024
