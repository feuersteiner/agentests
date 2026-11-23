"""Settings, read from the environment when the module is imported."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kestrel@localhost:5432/invoicing")
DB_CONNECT_TIMEOUT_S = float(os.environ.get("DB_CONNECT_TIMEOUT_S", "5"))

# Boot: how the worker keeps trying while Postgres is not ready yet.
DB_CONNECT_MAX_ATTEMPTS = int(os.environ.get("DB_CONNECT_MAX_ATTEMPTS", "8"))
DB_RETRY_BASE_DELAY_S = 0.5
DB_RETRY_MAX_DELAY_S = 30.0

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
QUEUE_NAME = "invoice-jobs"
QUEUE_POP_TIMEOUT_S = 5

BILLING_API_URL = os.environ.get("BILLING_API_URL", "http://localhost:8081")
BILLING_API_TOKEN = os.environ.get("BILLING_API_TOKEN", "")
HTTP_TIMEOUT_S = float(os.environ.get("HTTP_TIMEOUT_S", "10"))

WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "dev-secret")
