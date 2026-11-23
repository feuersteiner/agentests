"""The shop's metrics. GET /metrics serves them through telemetry.render()."""

from telemetry import Counter, Histogram

HTTP_REQUESTS = Counter(
    "marrow_http_requests_total",
    "HTTP requests handled, by route template, method and status class.",
    ["route", "method", "status_class"],
)

CHECKOUTS = Counter(
    "marrow_checkouts_total",
    "Completed checkouts, by the customer's plan.",
    ["plan"],
)

CHECKOUT_VALUE = Histogram(
    "marrow_checkout_value_pounds",
    "Order value at checkout, in pounds.",
    buckets=(5, 10, 20, 40, 80, 160),
)

REQUEST_LATENCY = Histogram(
    "marrow_http_request_duration_seconds",
    "Time to handle a request, by route template and the user's plan.",
    ["route", "plan"],
)

IMPORT_ROWS = Counter(
    "marrow_catalogue_import_rows_total",
    "Catalogue rows read by the importer, by outcome.",
    ["outcome"],
)
