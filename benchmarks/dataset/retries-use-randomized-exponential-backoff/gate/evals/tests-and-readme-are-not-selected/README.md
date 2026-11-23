# invoicing-worker

Kestrel Freight's invoicing worker. The booking API pushes an invoice job onto a Redis list for
every delivered shipment. This worker pops each job, creates the invoice through the billing API,
records it in Postgres and, when the customer registered a webhook, sends them an
`invoice.created` event.

## Running

```sh
python -m app.main
```

It reads its settings from the environment (see below). The production image installs the
`production` extra (`psycopg` and `redis`); nothing else is needed.

## Configuration

| Variable               | Default                                          | Meaning                                     |
| ---------------------- | ------------------------------------------------ | ------------------------------------------- |
| `DATABASE_URL`         | `postgresql://kestrel@localhost:5432/invoicing`  | The Postgres database invoices are saved to |
| `DB_CONNECT_TIMEOUT_S` | `5`                                              | Seconds to wait for a Postgres connection   |
| `BILLING_API_URL`      | `http://localhost:8081`                          | Base URL of the billing API                 |
| `BILLING_API_TOKEN`    | empty                                            | Bearer token for the billing API            |
| `HTTP_TIMEOUT_S`       | `10`                                             | Timeout of every HTTP request, in seconds   |
| `WEBHOOK_SECRET`       | `dev-secret`                                     | Key that signs webhook bodies (HMAC-SHA256) |

## Layout

- `app/config.py`: the settings above.
- `app/models.py`: `Job`, `Invoice` and `format_amount`.
- `app/db.py`: the Postgres connection and the `invoices` table.
- `app/clients/billing.py`: `BillingClient`, for the billing API.
- `app/webhooks.py`: `WebhookSender` and the `invoice.created` payload.
- `app/worker.py`: the job queue, the processor that handles one job, the consumer loop and `main`.
- `tests/`: pytest tests; `tests/fakes.py` holds a fake billing API, webhook receiver, Postgres
  driver and Redis client, so the tests need neither a network nor a database.

## Tests

```sh
python -m pytest
```
