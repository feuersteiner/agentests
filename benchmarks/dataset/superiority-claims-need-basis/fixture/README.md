# Orbitly marketing content

The marketing copy for Orbitly, the project-management tool for agencies and product teams, with
the small script we use to keep it tidy.

## Layout

- `content/landing/`: landing pages for orbitly.example, one Markdown file per page.
  - `home.md`: the home page.
  - `pricing.md`: the pricing page.
- `content/features/`: one page per feature.
  - `timeline.md`: the timeline view.
- `docs/product-facts.md`: what Orbitly does, the plans and what each includes. Copy takes its
  facts from here.
- `docs/evidence/`: third-party reports we hold on file.
  - `benchmark-2026.md`: the Northgate Labs board load test of March 2026.
- `data/plans.json`: the plans as data, read by the pricing page.
- `scripts/check_content.py`: checks the front matter of every page.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed in the content, newest first.

## Pages

Every page starts with front matter holding a `title` and a `description` of at most 160
characters, then one top-level heading. Landing pages are served from the root of the site
(`content/landing/pricing.md` is `/pricing`, and `home.md` is `/`); every other page is served
from its path under `content/` (`content/features/timeline.md` is `/features/timeline`).

## Ads

Search ad headlines live under `content/ads/`, one headline per list item, at most 30 characters
each. These files are plain lists with no front matter.

## Checks

```sh
python3 scripts/check_content.py
python3 -m pytest
```
