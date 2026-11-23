# Larkspur Data: sales desk

Working documents for Larkspur Data's sales team. Larkspur is hosted product analytics: it
collects events from a customer's web and mobile apps and serves funnels, retention charts and
dashboards. We sell two packages, Standard and Enterprise, on annual contracts. Larkspur was
founded in 2019 and is based in Denver.

## Layout

- `policy/contract-rules.md`: how every contract is priced and structured: volume discounts,
  terms, renewal, billing and approvals.
- `pricing/packages.md`: what Standard and Enterprise include and what they cost.
- `data/packages.json`: list prices, seat minimums and the volume discount ladder, for the scripts
  and for billing.
- `customers/<customer>/`: what each customer or prospect has sent us, such as an RFP.
  - `quillon/rfp.md`: Quillon's request for proposal, received 4 November.
- `status/uptime-2026.md`: our measured uptime by month, from the status page.
- `proposals/`: proposals, RFP responses and summaries we send to customers, one file per
  document.
  - `quillon.md`: the Standard proposal sent to Quillon on 16 November.
- `orders/`: order forms, one per customer, copied from `templates/order-form.md` and filled in.
- `templates/order-form.md`: the order form template.
- `scripts/quote.py`: the yearly price of a package for a number of seats, after volume discount.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

Everything under `proposals/` and `orders/` is plain Markdown and starts with a level-1 heading.
A proposal has its expiry in italics under the heading: `_Valid until 7 December 2026_`. An order
form keeps the template's fields and fills in every one of them.

## Scripts

```sh
python3 scripts/quote.py standard 50   # yearly price of Standard for 50 seats
python3 scripts/check_docs.py          # lists every document that breaks a convention
python3 -m pytest                      # runs the tests
```
