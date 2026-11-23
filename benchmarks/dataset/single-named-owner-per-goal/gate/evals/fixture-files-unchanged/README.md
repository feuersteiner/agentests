# Larkspur Data: team planning

Quarterly planning documents for the product teams at Larkspur Data. Larkspur Data is an
analytics platform for retail and e-commerce teams: it connects to the web shop, the tills and the
warehouse, and sends each team the dashboards and daily reports it needs.

## Layout

- `teams/`: one folder per team, with its people and its plans for each quarter.
  - `growth/README.md`: the growth team, its people and how it works.
- `planning/`: retros, brainstorms and other planning notes.
  - `q2-retro.md`: the growth team's Q2 retro, with the trial numbers.
  - `q3-brainstorm.md`: the growth team's ideas for Q3.
  - `templates/quarterly-goals.md`: the template for a quarter's goals.
- `data/`
  - `q2-weekly.csv`: the trial funnel by week for Q2, exported from the trial dashboard.
  - `team.json`: the people on each team, for the weekly numbers email.
- `scripts/metrics.py`: trial funnel numbers from a weekly export.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

Documents are plain Markdown. Every document starts with a top-level heading, and a dated
document has its date in italics under the heading. Relative links must point to files that
exist.

## Scripts

```sh
python3 scripts/metrics.py conversion data/q2-weekly.csv   # Q2 trial-to-paid conversion
python3 scripts/check_docs.py                              # lists documents that break a convention
python3 -m pytest                                          # runs the tests
```
