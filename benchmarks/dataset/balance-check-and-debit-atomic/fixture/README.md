# kestrel-billing

The billing service of Kestrel Print, a small online print shop. It keeps customer accounts with
prepaid credit, invoices, gift cards, coupons and orders. The storefront and the back office call
its functions directly.

It is plain Python 3 on SQLite, with no dependencies outside the standard library.

## Layout

- `app/db.py`: the SQLite connection, the schema and `transaction()`.
- `app/models.py`: the rows as dataclasses and the functions that look them up.
- `app/wallet.py`: account credit.
- `app/giftcards.py`: gift cards.
- `app/orders.py`: orders and coupons.
- `app/money.py`: formatting and parsing amounts. Amounts are whole pence everywhere.
- `app/clock.py`: the current time; `app/errors.py`: the errors callers see.
- `tests/`: the pytest suite. Each test gets a fresh in-memory database from `tests/conftest.py`.

## Functions

| Function                                         | What it does                                   |
| ------------------------------------------------ | ---------------------------------------------- |
| `wallet.balance(user_id)`                        | The customer's credit in pence                 |
| `wallet.add_credit(user_id, amount_cents, why)`  | Top up the customer's credit                   |
| `wallet.credit_history(user_id)`                 | Every change to the customer's credit          |
| `wallet.pay_with_credit(user_id, invoice_id)`    | Not built yet                                  |
| `giftcards.issue_gift_card(value_cents)`         | Create a gift card and return its code         |
| `orders.place_order(user_id, lines, coupon)`     | Place an order, with an optional coupon        |
| `orders.order_total(order_id)`                   | What the customer pays for an order            |

## Running the tests

```sh
python3 -m pytest
```
