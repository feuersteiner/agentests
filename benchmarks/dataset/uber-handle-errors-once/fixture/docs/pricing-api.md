# Pricing service

The pricing team runs the service that owns current prices. Stockroom's catalogue holds a copy
that can be a few hours old.

## Current price of a product

```text
GET {base URL}/prices/{sku}
```

Answers `200` with:

```json
{ "sku": "HX-204", "price_cents": 1299, "currency": "EUR" }
```

It answers `404` for a SKU it does not know and `503` while it is reloading its price list, which
takes a few seconds. Prices are integers in cents.

The base URL differs per environment. Locally the pricing team's stub listens on
`http://localhost:8090`.
