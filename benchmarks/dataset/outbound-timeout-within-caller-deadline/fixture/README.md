# quote-api

The HTTP API behind the price box on Pellham Supply's trade storefront. Given a SKU, a quantity,
a customer and a delivery region, it asks the pricing and tax services and answers with the
customer's subtotal, tax and total. It runs on [Bun](https://bun.sh) and has no dependencies.

## Endpoints

| Request                                       | Answer               |
| --------------------------------------------- | -------------------- |
| `GET /quote?sku=&quantity=&customer=&region=` | The quote, as below  |
| `GET /health`                                 | `{ "status": "ok" }` |

```json
{
	"sku": "BOLT-M8",
	"quantity": 100,
	"subtotalCents": 41200,
	"taxCents": 2987,
	"totalCents": 44187,
	"total": "$441.87"
}
```

A missing `sku`, `customer` or `region` gets 400, and an error from a service gets 502.

## Layout

| Path                         | What it holds                                                  |
| ---------------------------- | -------------------------------------------------------------- |
| `src/server.ts`              | Starts the server and routes each request                      |
| `src/config.ts`              | The port, the request time limit and the services' base URLs   |
| `src/middleware/deadline.ts` | Gives each request its deadline and answers 504 when it passes |
| `src/routes/quote.ts`        | `GET /quote`                                                   |
| `src/routes/health.ts`       | `GET /health`                                                  |
| `src/clients/pricing.ts`     | Client of the pricing service                                  |
| `src/clients/tax.ts`         | Client of the tax service                                      |
| `src/money.ts`               | `formatCents`, which formats an amount in cents as dollars     |
| `src/errors.ts`              | `UpstreamError`, thrown when a service answers with an error   |

## Services

| Setting       | Service | Used for                          |
| ------------- | ------- | --------------------------------- |
| `PRICING_URL` | Pricing | The customer's unit price         |
| `TAX_URL`     | Tax     | The sales tax rate of the region  |

[docs/services.md](docs/services.md) describes each service's API.

## Development

```sh
bun test
bun run start
```

The tests replace `fetch` with fake services from `test/fake-upstreams.ts`, so they need no
network. Notable changes go in `CHANGELOG.md`, under `Unreleased`.
