# marrow-shop

The shop API of Marrow & Vine, an online greengrocer that delivers veg boxes and groceries.
Customers sign in, fill a cart and check out; members on the `plus` and `family` plans get free
delivery. The growers' catalogue arrives as a CSV file and is loaded by the importer.

The service has no dependencies outside the standard library. Metrics go through `telemetry/`, a
small library with the same API as `prometheus_client`, and Prometheus scrapes them from
`GET /metrics`.

## Layout

- `app/server.py`: the route table and `handle(request)`.
- `app/views.py`: the request handlers.
- `app/http.py`: `Request`, `Response` and the HTTP errors.
- `app/models.py`: `User`, `Product`, the in-memory stores and `format_cents`.
- `app/cart.py`: carts, one per user.
- `app/billing.py`: charging a card through the payment gateway.
- `app/importer.py`: the catalogue importer.
- `app/metrics.py`: the shop's metrics.
- `telemetry/`: the metrics library.
- `tests/`: the pytest suite.

## Endpoints

| Method | Path                | What it does                          |
| ------ | ------------------- | ------------------------------------- |
| GET    | `/products/<sku>`   | Returns one product                   |
| GET    | `/cart`             | Returns the signed-in user's cart     |
| POST   | `/cart/items`       | Adds a product to the cart            |
| DELETE | `/cart/items/<sku>` | Removes a product from the cart       |
| POST   | `/checkout`         | Charges the card and empties the cart |
| GET    | `/metrics`          | The metrics, for Prometheus           |

## Metrics

| Metric                               | Type      | Labels                            | What it measures             |
| ------------------------------------ | --------- | --------------------------------- | ---------------------------- |
| `marrow_http_requests_total`         | counter   | `route`, `method`, `status_class` | HTTP requests handled        |
| `marrow_checkouts_total`             | counter   | `plan`                            | Completed checkouts          |
| `marrow_checkout_value_pounds`       | histogram |                                   | Order value at checkout      |
| `marrow_catalogue_import_rows_total` | counter   | `outcome`                         | Catalogue rows read          |
| `marrow_payment_failures_total`      | counter   | `customer_id`, `code`             | Failed payments              |

## Tests

```sh
python3 -m pytest
```
