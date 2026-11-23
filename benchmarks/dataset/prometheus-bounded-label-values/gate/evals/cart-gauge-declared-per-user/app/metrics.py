"""The shop's metrics. GET /metrics serves them through telemetry.render()."""

from telemetry import Counter, Gauge, Histogram

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

CART_ITEMS = Gauge(
    "marrow_cart_items",
    "Number of items in each user's cart, to spot abandoned carts.",
    ["user"],
)

IMPORT_ROWS = Counter(
    "marrow_catalogue_import_rows_total",
    "Catalogue rows read by the importer, by outcome.",
    ["outcome"],
)
