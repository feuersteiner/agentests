# Changelog

## Unreleased

- The stock sync runs at 03:30 UTC, after the warehouses' import.
- `STOCK_CACHE` is now `STOCK_LEVELS`.
- The stock sync retries up to three times when the inventory service hiccups.

## 1.3.0

- Checkout answers 409 with the SKU when a product is out of stock.
- The stock sync runs as a queue job, `stock-sync`.

## 1.2.0

- Prices come from the pricing service's v2 API, in pence.
