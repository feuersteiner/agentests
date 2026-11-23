# Services the quote API calls

Each service is an internal HTTP API that answers JSON. Its base URL lives in `src/config.ts`.

## Pricing (`PRICING_URL`)

`GET /prices/{sku}?customer={customerId}` returns the customer's unit price in cents:

```json
{ "sku": "BOLT-M8", "unitPriceCents": 412 }
```

It answers 404 for an unknown SKU.

## Tax (`TAX_URL`)

`GET /rates?region={region}` returns the sales tax rate of a region:

```json
{ "region": "CA", "rate": 0.0725 }
```

## Shipping estimate (new)

Base URL `http://shipping-estimate.internal:8080`.

`GET /estimates?sku={sku}&quantity={n}&region={region}` returns the cost and the number of
working days to deliver an order:

```json
{ "costCents": 1250, "days": 3 }
```

## Fraud score (new)

Base URL `http://fraud-score.internal:8080`.

`GET /scores?customer={customerId}` returns a risk score from 0 (no risk) to 100:

```json
{ "customer": "c_204", "score": 12 }
```

Sales and the risk team agreed that the storefront refuses to quote a customer whose score is 80
or more: the quote API answers 403 with `{ "error": "quote refused" }`.
