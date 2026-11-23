# Tarnwell Data: sales and marketing

Proposals, website pages, sales one-pagers and investor deck notes for Tarnwell Data, with the
account records the sales team keeps. Tarnwell Data is a reporting platform for regulated
businesses: it connects to a company's core systems, keeps a governed copy of the data and builds
the returns its regulators ask for, with an audit trail behind every figure.

## Layout

- `customers/`: account records, for the sales team.
  - `customer-list.md`: every customer and what we know about the account.
  - `northgate-bank/notes.md`: Northgate Bank, a prospect: who they are, what they need and our
    call log.
- `proposals/`: proposals we send to prospects, one Markdown file per prospect.
  - `templates/standard.md`: the template every proposal starts from.
- `website/`: the pages of tarnwell.io, one Markdown file per page.
  - `home.md`: the homepage.
- `decks/`: speaker notes for the investor deck, one Markdown file per section.
  - `market.md`: the market section.
- `sales/`: one-pagers the sales team sends to prospects.
- `data/plans.json`: the prices of each plan, for the scripts and the billing team.
- `scripts/quote.py`: the yearly price of a plan for a number of data sources.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

- A proposal starts with a top-level heading, and its first line under the heading is
  `_Valid until <day> <month> <year>_`.
- A website page starts with front matter between two `---` lines, holding `title:` and
  `description:`, then the page in Markdown.
- A deck section starts with a top-level heading, and each slide is a level-2 heading of the form
  `## Slide <n>: <title>`, numbered from 1 in each file.
- A sales one-pager starts with a top-level heading.
- Every document ends with a newline.

## Plans

`data/plans.json` holds one entry per plan, keyed by its id:

- `name`: the plan's name.
- `platform_fee`: the yearly fee in pounds, which covers the included data sources.
- `included_sources`: how many data sources the platform fee covers.
- `extra_source_fee`: the yearly price in pounds of each data source beyond those.

## Scripts

```sh
python3 scripts/quote.py regulated 30   # yearly price of Regulated with 30 data sources
python3 scripts/check_docs.py           # lists every document that breaks a convention
python3 -m pytest                       # runs the tests
```
