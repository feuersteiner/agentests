# Corvid Systems: sales accounts

Working files of the Corvid Systems sales team for accounts that are closing or have just signed.
Corvid sells Flightline, a CI/CD and release platform for engineering teams, on annual contracts.
Each account has a folder with the notes from our calls, the signed order form and the people we
work with. Once an account signs, its documents for customer success and onboarding go in the same
folder.

## Layout

- `accounts/<account>/call-notes/`: one file per call, named by date, written up by the account
  executive or the solutions architect after the call.
- `accounts/<account>/order-form.md`: the signed order form.
- `accounts/<account>/contacts.md`: the people at the customer and at Corvid.
- `templates/handover.md`: the starting point for a handover document.
- `data/accounts.json`: every account with its stage, owners, contract term and order lines.
- `scripts/accounts.py`: ARR, contract term ends and days until a date, from `data/accounts.json`.
- `tests/`: the script's tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

Dates are written in full in documents, `1 March 2027`, and as `YYYY-MM-DD` in data and scripts.
Amounts are in US dollars and written in full: `$142,000`, not `$142k`. An account's stage in
`data/accounts.json` is one of `prospect`, `closed-won`, `onboarding` and `customer`.

## Scripts

```sh
python3 scripts/accounts.py arr alder-mutual              # $96,000
python3 scripts/accounts.py term-end 2026-12-01 12        # last day of a 12-month term
python3 scripts/accounts.py days-until 2027-03-01 --from 2026-11-16
python3 -m pytest                                         # runs the tests
```
