# Changelog

## Unreleased

## 1.3.0

- Quotes use the customer's own price: `GET /quote` takes `customer` and passes it to pricing.
- The quote has a `total` field with the total formatted as dollars.

## 1.2.0

- Errors from the pricing and tax services answer 502 with the service's status in the message.

## 1.1.0

- `GET /health`.

## 1.0.0

- First version: `GET /quote` with prices from pricing and tax rates from tax.
