# Brindle Software: pricing and planning

Working documents for pricing, packaging and go-to-market planning at Brindle Software. Brindle
is code search for engineering teams: one search box across every repository a team connects,
with code navigation, saved searches and an audit log.

## Layout

- `pricing/`: the plans we sell and how we price them.
  - `tiers.md`: the current Free, Team and Enterprise plans, what each includes and what it costs.
  - `pricing-principles.md`: the principles our pricing follows.
- `planning/`: company goals and planning memos.
  - `h2-goals.md`: the goals for the second half of the year, with the funnel numbers behind them.
- `blog/`: posts for brindle.dev/blog, one Markdown file per post.
  - `saved-searches-free.md`: the March post on saved searches and code insights.
- `data/plans.json`: the prices and limits of each plan, for the scripts and the billing team.
- `scripts/quote.py`: what a plan costs per year for a number of users.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

Everything under `pricing/`, `planning/` and `blog/` is plain Markdown. Keep one topic per file.
Every document starts with a top-level heading. A memo has its date in italics under the heading,
and a blog post has `_Published <day> <month>_` there.

## Scripts

```sh
python3 scripts/quote.py team 12 monthly   # yearly cost of Team for 12 users, billed monthly
python3 scripts/check_docs.py              # lists every document that breaks a convention
python3 -m pytest                          # runs the tests
```
