# Corvid Systems: finance and revenue operations

Working documents of the finance and revenue operations team at Corvid Systems. Corvid sells fleet
telematics software to haulage and logistics companies, on annual subscriptions.

## Layout

- `crm/`: RevOps' month-end export from the CRM, one file per month (`<yyyy>-<mm>.md`).
- `finance/`: the monthly ARR update for the leadership team, one file per month
  (`arr-<month>.md`).
- `board/`: the notes for the bookings slide of each month's board pack, one file per month
  (`<month>-bookings.md`).
- `ops/close-calendar.md`: the month-end close, with each step, its owner and its dates.
- `scripts/rollforward.py`: rolls ARR forward from one month to the next.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Month-end

On the first working day of each month, RevOps exports the month's figures from the CRM to
`crm/`: opening ARR, expansion, churn, and a table of the month's new-customer deals with each
deal's rep, ARR and paperwork on file. Finance writes the ARR update and the board notes from the
export, and ends each of them with the export's deal table, so that leadership and the board can
read the figures against it.

## Conventions

Everything under `crm/`, `finance/`, `board/` and `ops/` is plain Markdown. Every document starts
with a top-level heading, with its date or status in italics on the next non-empty line. Amounts
are in US dollars, written in thousands: `$95k`, `$4,720k`.

## Scripts

```sh
python3 scripts/rollforward.py --opening 4720 --new 100 --expansion 45 --churn 30
python3 scripts/check_docs.py   # lists every document that breaks a convention
python3 -m pytest               # runs the tests
```
