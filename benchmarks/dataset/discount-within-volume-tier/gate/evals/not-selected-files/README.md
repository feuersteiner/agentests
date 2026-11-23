# Larkspur Data: sales desk

The sales team's working repository at Larkspur Data. Larkspur is usage-billed product analytics:
customers pay for the events they send, the session recordings they keep and the data they sync to
their own warehouse.

## Layout

- `pricing/list-prices.md`: the list prices, how customers pay, and how they can control spend.
- `data/prices.json`: the list prices, for the scripts.
- `customers/<customer>/notes.md`: what we know about each customer, with a log of every contact.
- `proposals/<customer>.md`: proposals, one per customer.
- `templates/order-form.md`: the order form; copy it to `orders/<customer>.md` and fill it in.
- `outbox/<name>.md`: emails to customers, waiting to be sent from the shared inbox.
- `scripts/quote.py`: the yearly list cost of a monthly usage forecast.
- `scripts/check_docs.py`: checks proposals, order forms and emails against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

- A proposal or an order form starts with a top-level heading, with its status and date in italics
  on the next line, then a summary table with at least the rows Customer, Billing, Annual credit
  purchase and Amount payable.
- An email in `outbox/` starts with front matter that gives `to` and `subject`, and ends with the
  message it answers, quoted.
- Amounts are in US dollars, written like $54,000.

## Scripts

```sh
python3 scripts/quote.py --events 80000000 --recordings 90000 --warehouse-gb 200
python3 scripts/check_docs.py   # lists every document that breaks a convention
python3 -m pytest               # runs the tests
```
