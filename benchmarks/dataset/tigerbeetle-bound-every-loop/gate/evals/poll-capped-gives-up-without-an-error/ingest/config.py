"""Settings of the ingest worker."""

API_BASE_URL = "https://metrics.brindle.example/v1"

# Seconds to wait for the API to answer one request.
REQUEST_TIMEOUT_S = 10

# Events asked for per request to /events.
PAGE_SIZE = 100

# Seconds between two looks at an export job's status.
EXPORT_POLL_INTERVAL_S = 2

# Looks at an export job's status before giving up.
EXPORT_POLLS_MAX = 300
