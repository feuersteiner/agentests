"""Settings of the ingest worker."""

API_BASE_URL = "https://metrics.brindle.example/v1"

# Seconds to wait for the API to answer one request.
REQUEST_TIMEOUT_S = 10

# Events asked for per request to /events.
PAGE_SIZE = 100

# Pages one sync may fetch from /events before it gives up.
SYNC_PAGES_MAX = 10_000
