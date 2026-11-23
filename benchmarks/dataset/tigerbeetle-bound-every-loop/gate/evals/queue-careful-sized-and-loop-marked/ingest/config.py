"""Settings of the ingest worker."""

API_BASE_URL = "https://metrics.brindle.example/v1"

# Seconds to wait for the API to answer one request.
REQUEST_TIMEOUT_S = 10

# Events asked for per request to /events.
PAGE_SIZE = 100

# Uploads that may wait for the worker thread; more are refused.
UPLOAD_QUEUE_MAX = 100

# Seconds stop() waits for the worker thread to finish the queued uploads.
WORKER_STOP_TIMEOUT_S = 30
