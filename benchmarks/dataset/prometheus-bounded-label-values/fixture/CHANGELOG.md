# Changelog

## Unreleased

## 0.7.0 (2026-10-29)

- The importer reports every skipped row with its line number.
- `GET /metrics` serves the shop's metrics in the Prometheus text format.

## 0.6.0 (2026-09-17)

- Checkout answers 402 with the gateway's decline code when a payment is declined.
- Carts are kept per user and survive a declined payment.
