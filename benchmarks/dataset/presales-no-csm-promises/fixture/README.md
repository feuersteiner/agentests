# Corvid Systems: account desk

Working files of the Corvid Systems account team, the account executives and solutions architects
who sell Flightline, our CI/CD and release platform, to engineering teams on annual contracts. Each
deal has its account notes, its proposal and the emails we send, drafted here before they go out.

## Layout

- `accounts/<account>/notes.md`: account notes, contacts and call notes, newest call first.
- `proposals/`: proposals, one Markdown file per customer.
  - `kestrel.md`: the proposal for Kestrel Insurance, in progress.
- `outbox/`: emails to customers, drafted here before they are sent.
- `product/plans.md`: the Flightline plans, what each includes, and list prices.
- `cs/csm-program.md`: how customer success works at Corvid, from the customer success team.
- `data/accounts.json`: every account with its stage, plan, seats, term and owners.
- `data/plans.json`: each plan's price per seat and minimum seats, for the scripts.
- `scripts/accounts.py`: an account's yearly contract value, and the days until a date.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, newest month first.

## Conventions

Every document under `accounts/`, `proposals/` and `outbox/` is plain Markdown and starts with a
top-level heading. An email in `outbox/` has a `To:` line and a `Subject:` line under its heading.
Dates are written in full in documents, `15 December 2026`, and as `YYYY-MM-DD` in data. Amounts
are in US dollars and written like $105,000.

## Scripts

```sh
python3 scripts/accounts.py arr alder-mutual                          # yearly contract value
python3 scripts/accounts.py days-until 2026-12-15 --from 2026-11-23   # days from one date to another
python3 scripts/check_docs.py                                         # lists every document that breaks a convention
python3 -m pytest                                                     # runs the tests
```
