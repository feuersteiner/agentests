# ironbark-storefront

The storefront API of Ironbark Hardware, an online shop for tools and fixings. It answers the
product pages and the checkout, and it gets stock levels and prices from two internal services,
inventory and pricing. A nightly job copies every product's stock level into a cache, so the
product pages never wait on the inventory service.

The service has no dependencies outside the standard library.

## Layout

- `app/http.py`: `SESSION`, the HTTP session the clients share, with its timeout and retry settings.
- `app/clients/inventory.py`: `InventoryClient`, stock levels from the inventory service.
- `app/clients/pricing.py`: `PricingClient`, prices from the pricing service.
- `app/api/checkout.py`: `POST /checkout`, which checks stock, prices the cart and places the order.
- `app/queue.py`: the job queue, the `@job` decorator and `run_job`.
- `app/jobs/config.py`: the jobs' settings and schedule.
- `app/jobs/sync.py`: the nightly stock sync.
- `app/models.py`: the catalogue, the stock cache, orders and `format_price`.
- `tests/`: the pytest suite, with a fake network in `tests/conftest.py`.

## Jobs

| Job          | Schedule (UTC) | What it does                                         |
| ------------ | -------------- | ---------------------------------------------------- |
| `stock-sync` | `30 3 * * *`   | Copies every product's stock level into the cache    |

## Tests

```sh
python3 -m pytest
```
