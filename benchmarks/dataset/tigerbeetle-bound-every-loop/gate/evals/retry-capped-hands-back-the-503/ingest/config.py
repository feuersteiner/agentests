"""Settings of the ingest worker."""

API_BASE_URL = "https://metrics.brindle.example/v1"

# Seconds to wait for the API to answer one request.
REQUEST_TIMEOUT_S = 10

# Events asked for per request to /events.
PAGE_SIZE = 100

# Attempts at one request before giving up on 503 answers.
RETRY_ATTEMPTS_MAX = 5

# Seconds before the first retry; doubles each time, up to the maximum.
RETRY_BACKOFF_S = 0.5
RETRY_BACKOFF_S_MAX = 8
