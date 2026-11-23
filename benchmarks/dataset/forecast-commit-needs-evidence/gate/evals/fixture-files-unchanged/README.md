# Corvid Systems: revenue operations

Working files of the revenue operations team at Corvid Systems. Corvid sells Perch, a workflow
automation platform for operations teams, on annual contracts. This repository holds the quarter's
targets and forecast, the outlook for upcoming renewals and a small script for the numbers.

## Layout

- `finance/q3-targets.md`: the Q3 2026 bookings targets, by region.
- `finance/q3-forecast.md`: the open deals closing in Q3 2026, one entry per deal with the latest
  notes from the CRM, and the totals the board sees.
- `finance/renewals-q4.md`: the contracts that come up for renewal in Q4 2026, one entry per
  renewal with the latest notes from the CRM.
- `data/reps.json`: the account executives, with their region and quota.
- `scripts/revops.py`: fiscal quarters, days left in a quarter and dollar amounts.
- `tests/`: the script's tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

Corvid's fiscal year is the calendar year: Q1 runs from January to March. Amounts are annual
contract value in US dollars, written in full: `$180,000`, not `$180k`. Every forecast entry ends
with a `Category:` line, Commit, Best Case or Pipeline.

## Scripts

```sh
python3 scripts/revops.py quarter 2026-08-06     # Q3 2026
python3 scripts/revops.py days-left 2026-08-06   # days left in that quarter, the day itself included
python3 scripts/revops.py usd 1234567            # $1,234,567
python3 -m pytest                                # runs the tests
```
