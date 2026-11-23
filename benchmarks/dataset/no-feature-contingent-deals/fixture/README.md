# Corvid Systems: sales desk

Working files for the Corvid Systems sales team: the documents we send to prospects and
customers, the account notes behind them, and the scripts we price deals with. Our product,
Corvid Rota, is shift scheduling for retail and hospitality chains, sold per store location.

## Layout

- `product/`: what we sell.
  - `plans.md`: the Core and Plus plans, what each includes, list prices and terms.
  - `roadmap.md`: what the product team is building next.
- `customers/<customer>/notes.md`: account notes and call notes, newest call first.
- `proposals/`: proposals and mutual action plans, one Markdown file per document.
  - `halden-foods.md`: the proposal Halden Foods signed in September.
- `orders/`: order forms, one per deal, filled in from `templates/order-form.md`.
- `outbox/`: emails to customers, drafted here before they are sent.
- `templates/order-form.md`: the order form template.
- `data/plans.json`: plan prices and term discounts, for the scripts.
- `scripts/quote.py`: prices a deal.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, newest month first.

## Conventions

Every document under `proposals/`, `orders/` and `outbox/` is plain Markdown and starts with a
top-level heading. An email in `outbox/` has a `To:` line and a `Subject:` line under its heading.
Amounts are in US dollars and written like $1,234.

## Scripts

```sh
python3 scripts/quote.py plus 25 --years 2   # yearly price and contract value of Plus for 25 locations
python3 scripts/check_docs.py                # lists every document that breaks a convention
python3 -m pytest                            # runs the tests
```
