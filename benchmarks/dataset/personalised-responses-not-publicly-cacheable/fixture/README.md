# ashgrove-store

The web storefront of Ashgrove Games, an online shop for independent games. Visitors browse the
store; customers log in to see their account, their orders and checkout. The site is served in
English, German and French.

The app needs only the standard library. `app/web.py` is a small request and response layer in
the style of Flask, and `app/db.py` stands in for the Postgres database.

## Layout

- `app/__init__.py`: `create_app()`, which wires the hooks and the views together.
- `app/web.py`: `Request`, `Response`, `NotFound` and `App` (routes, before and after hooks).
- `app/middleware.py`: the hooks that run around every request.
- `app/routes/store.py`: the front page and the product pages.
- `app/routes/account.py`: the account, orders and checkout pages.
- `app/catalog.py`: featured games, bestsellers and recommendations.
- `app/i18n.py`: interface strings and price formats.
- `app/cache.py`: the application cache (Redis in production, in memory otherwise).
- `app/db.py`: products, customers, sessions, orders and carts.
- `deploy/cdn.yaml`: the CDN's edge rules.
- `tests/`: the pytest suite.

## Pages

| Path                     | Page                                  |
| ------------------------ | ------------------------------------- |
| `/store`                 | Front page: featured and bestsellers  |
| `/store/products/<slug>` | One game                              |
| `/account`               | The customer's details                |
| `/account/orders`        | The customer's orders                 |
| `/checkout`              | The customer's cart and billing       |
| `/healthz`               | Health check for the load balancer    |

## Deploy

The app runs behind the CDN configured in `deploy/cdn.yaml`. Set `REDIS_URL` to use Redis for
the application cache.

## Tests

```sh
python3 -m pytest
```
