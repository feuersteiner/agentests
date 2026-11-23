# accounts-service

Oakhurst Hosting's accounts service: the plans we sell, customer subscriptions and the charges they
produce, the TLS certificates we issue for customers' domains, and the account page a customer sees
after signing in.

## Layout

- `billing/plans.py`: the plans and their yearly prices, and `format_price`.
- `billing/subscriptions.py`: `Subscription`, one customer's plan and the first day of its current
  term.
- `billing/schedule.py`: `Charge` and the charges a subscription produces.
- `certs/issue.py`: `issue_certificate`, which issues a certificate for a customer's domain. A
  certificate is valid for 90 days from the day it is issued.
- `account/page.py`: `render_account_page`, the HTML of the account page.
- `tests/`: pytest tests.

## Tests

```sh
python -m pytest tests/unit
```
