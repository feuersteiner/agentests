"""Settings, read from the environment."""

import os
from datetime import timedelta

STORAGE_ACCOUNT = os.environ.get("FERNPOINT_STORAGE_ACCOUNT", "fernpointdev")
STORAGE_KEY = os.environ.get("FERNPOINT_STORAGE_KEY", "")
STORAGE_URL = f"https://{STORAGE_ACCOUNT}.blob.core.windows.net"

MAX_AVATAR_BYTES = 2 * 1024 * 1024

# How long a project file's download link stays valid.
ATTACHMENT_LINK_TTL = timedelta(minutes=int(os.environ.get("FERNPOINT_ATTACHMENT_LINK_MINUTES", "15")))
