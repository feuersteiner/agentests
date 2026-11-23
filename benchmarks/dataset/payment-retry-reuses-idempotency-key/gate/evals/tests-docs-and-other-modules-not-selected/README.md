# fernhill-payments

Captures card payments for the Fernhill Market checkout. The checkout authorizes the card; this
service captures the money when an order ships, keeps a record of every capture, and reports each
day's settlement. It runs on [Bun](https://bun.sh) and has no dependencies.

## Layout

| Path                       | What it holds                                                           |
| -------------------------- | ----------------------------------------------------------------------- |
| `src/payments/provider.ts` | The card provider's API as this service uses it, and its error types.   |
| `src/payments/repo.ts`     | Payment and capture records (Postgres in production, in memory here).   |
| `src/payments/service.ts`  | `capturePayment` and `paymentStatus`.                                   |
| `src/jobs/index.ts`        | The background jobs, and `startJobs`, which runs them on a timer.       |
| `src/jobs/settlement.ts`   | The daily settlement report.                                            |
| `src/money.ts`             | `formatAmount`, for amounts in minor units.                             |
| `test/`                    | The `bun test` suite, with a fake provider in `test/fake-provider.ts`.  |

## Payments

All amounts are integers in minor units (cents, pence). A payment is authorized at checkout, and
`capturePayment(paymentId, amount)` captures it with the provider when the order ships.
`paymentStatus(paymentId)` gives what the back office shows: `uncaptured`, `capture_pending` or
`captured`.

The provider's HTTP client belongs to the platform team and implements the `PaymentProvider`
interface; the worker process passes it in with the repository.

## Jobs

The worker process builds the jobs with `paymentJobs()` and runs them with `startJobs()`, both in
`src/jobs/index.ts`.

| Job                 | Runs       | What it does                                               |
| ------------------- | ---------- | ---------------------------------------------------------- |
| `settlement-report` | once a day | Logs the previous day's captures and total, per currency.  |

## Development

```sh
bun test
```

Tests live in `test/`, one file per module. Notable changes go in `CHANGELOG.md`, under
`Unreleased`.
