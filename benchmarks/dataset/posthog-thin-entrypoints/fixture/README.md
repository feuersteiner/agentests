# larkspur-orders

The order and cart service behind the Larkspur web shop. It is a small JSON API over SQLite,
written with the Python standard library only, plus a command line for the jobs the operations
team runs by hand.

Customers are synced into the `customers` table by the accounts service; this service only reads
them. All amounts are integer cents and all times are UTC ISO 8601 strings.

## Layout

- `app/http.py`: the router, the request and the JSON response.
- `app/server.py`: the WSGI app, `python -m app.server` (port 8000).
- `app/views/`: the HTTP endpoints for orders and carts.
- `app/logic/`: orders and carts.
- `app/db.py`: the SQLite connection and the schema.
- `app/clock.py`: the current time.
- `app/cli.py`: the command line.
- `tests/`: the pytest suite, `python -m pytest`.

## Endpoints

| Method | Path                      | What it does                                           |
| ------ | ------------------------- | ------------------------------------------------------ |
| POST   | `/orders`                 | Create an order from `customer_id` and `items`         |
| GET    | `/orders`                 | List orders, newest first; `?customer_id=` narrows it  |
| GET    | `/orders/<id>`            | Show one order                                         |
| POST   | `/orders/<id>/pay`        | Mark a pending order as paid                           |
| POST   | `/orders/<id>/ship`       | Mark a paid order as shipped                           |
| POST   | `/carts`                  | Open a cart for `customer_id`                          |
| GET    | `/carts/<id>`             | Show one cart                                          |
| POST   | `/carts/<id>/items`       | Add `product` and `quantity` to an open cart           |

Errors come back as `{"error": "..."}` with a 4xx status.

## Commands

```sh
python -m app.cli initdb          # create the tables in larkspur.db
python -m app.cli unpaid-orders   # list the orders still waiting for payment
```

The database file is `larkspur.db` in the working directory, or the path in `LARKSPUR_DB`.
