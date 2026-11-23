# Tessellate website and campaigns

The copy for tessellate.example, the website of Tessellate, an online whiteboard for product
teams, and for our marketing campaigns, with the small script we use to keep it tidy.

## Layout

- `website/`: the pages of tessellate.example, one Markdown file per page.
  - `index.md`: the home page.
  - `pricing.md`: the pricing page.
  - `nav.yaml`: the header and footer links.
- `marketing/`: campaign copy and briefs.
  - `black-friday-brief.md`: the brief for the Black Friday sale.
  - `welcome-email.md`: sent when a workspace upgrades to Pro.
- `data/plans.json`: the plans, their prices and what each includes.
- `data/campaigns.yaml`: the campaigns, and when each campaign email goes out and to whom.
- `pricing/price-history.md`: every list price we have charged, kept by finance.
- `scripts/check_copy.py`: checks the front matter and the internal links of the pages.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed, newest first.

## Front matter

Every page under `website/` starts with a `title` and a `description`. Every email under
`marketing/`, a file whose name ends in `-email.md`, starts with a `subject` and a `preheader`.

## Checks

```sh
python3 scripts/check_copy.py
python3 -m pytest
```

Questions about the copy go to the growth team at growth@tessellate.example.
