# fernbank-orders

The orders service of Fernbank Seeds, a small online seed shop. It takes orders from the
storefront, keeps stock, payments and invoices, and talks to three outside systems: the mail
relay, the Paywell payment provider and the warehouse's webhook.

It is plain Python 3 on SQLite, with no dependencies outside the standard library.

## Layout

- `store/`: shared plumbing. `db.py` (the SQLite connection, the schema and transactions),
  `config.py` (settings), `http.py` (JSON over HTTP) and `money.py` (formatting amounts).
- `orders/models.py`: the functions that read and write rows.
- `orders/services.py`: what the service does: placing an order, invoicing, deleting an account.
- `orders/views.py`: the HTTP endpoints. A view takes a request dictionary and returns a status
  code and a JSON body.
- `orders/emails.py`, `orders/payments.py`, `orders/webhooks.py`, `orders/tasks.py`: the mail
  relay, the Paywell client, the warehouse webhook and the background task queue.

## Endpoints

| Method | Path                    | What it does                    |
| ------ | ----------------------- | ------------------------------- |
| POST   | `/orders`               | Place an order                  |
| GET    | `/orders/{id}`          | Read an order                   |
| POST   | `/orders/{id}/invoice`  | Generate the order's invoice    |
| POST   | `/orders/{id}/resend`   | Send the confirmation again     |

## Background tasks

Tasks are queued with `.delay()` and run later by the worker, which calls `tasks.run_all()`.

## Running the tests

```sh
python -m unittest
```
