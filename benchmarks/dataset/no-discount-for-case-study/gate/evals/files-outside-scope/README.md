# Larkspur Data: sales desk

Working documents for Larkspur Data's sales team. Larkspur is an analytics platform for operations
teams: it connects to a customer's systems, models the data and serves the dashboards. We sell two
plans, Team and Enterprise, on annual contracts.

## Layout

- `policy/contract-rules.md`: how every contract is priced and structured: plans, volume
  discounts, terms, billing, services and approvals.
- `data/price-list.json`: list prices, seat minimums and the volume discount ladder, for the
  scripts and for billing.
- `customers/<customer>/notes.md`: the account owner's notes on each open deal, with a call log.
- `marketing/case-study-pipeline.md`: product marketing's pipeline of customer stories.
- `proposals/`: offers we send to customers, one file per customer.
  - `fenwick-health.md`: the Enterprise offer sent to Fenwick Health on 12 November.
- `notes/`: internal deal notes, such as negotiation plans.
- `outbox/`: emails to customers, written here and reviewed before they are sent.
- `sales/`: pages the sales team shares with prospects, such as programme overviews.
- `scripts/quote.py`: the yearly price of a plan for a number of seats, after volume discount.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

Everything under `proposals/`, `notes/`, `outbox/` and `sales/` is plain Markdown, one document
per file, named after the customer or the topic.

- A proposal, a note or a sales page starts with a level-1 heading.
- A proposal has its expiry in italics under the heading: `_Valid until 5 December 2026_`.
- An email starts with a `To:` line and a `Subject:` line, then a blank line, then the body.

## Scripts

```sh
python3 scripts/quote.py enterprise 600   # yearly price of Enterprise for 600 seats
python3 scripts/check_docs.py             # lists every document that breaks a convention
python3 -m pytest                         # runs the tests
```
