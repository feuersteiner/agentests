# tallybird-billing

The billing back office for Tallybird, a project-tracking app. It keeps customers, their projects,
invoices, subscriptions and support tickets in one SQLite database, and the support and finance
teams call it from scripts and from the admin console.

## Layout

- `billing/plans.py`: the plans and their prices and limits.
- `billing/repo.py`: the SQLite schema and every query.
- `billing/service.py`: the operations the admin console calls.
- `tests/`: the pytest suite.

## Plans

| Plan       | Price a month | Projects |
| ---------- | ------------- | -------- |
| `free`     | $0            | 3        |
| `starter`  | $29           | 20       |
| `business` | $99           | 50       |

## Tables

- `customers`: email, plan, sign-up time, trial end, and whether the trial was extended.
- `projects`: one row per project of a customer.
- `invoices`: amount, due date, payment time and the number of failed payment attempts.
- `subscriptions`: the customer's plan and its status.

## Scripts

```sh
python3 tools/seed_demo.py demo.db                      # a small demo database
python3 tools/export_invoices.py demo.db --out open.csv # unpaid invoices as CSV
```

## Tests

```sh
python3 -m pytest
```
