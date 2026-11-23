# Shelfwise marketing content

The marketing copy for Shelfwise, the storefront app for independent bookshops, with the small
tools we use to keep it tidy.

## Layout

- `content/landing/`: landing pages for shelfwise.example, one Markdown file per page.
  - `home.md`: the home page.
  - `gift-cards.md`: the gift cards feature page.
- `emails/`: emails we send to shop owners, one Markdown file per email.
  - `welcome.md`: sent when a shop installs Shelfwise.
- `docs/product-facts.md`: what Shelfwise does, the plans and the current offers. Copy takes its
  facts from here.
- `data/plans.json`: the plans as data, read by the pricing page.
- `scripts/check_content.py`: checks the front matter of every page and email.
- `tests/`: the tests of the scripts.
- `CHANGELOG.md`: what changed in the content, newest first.

## Front matter

Every page starts with a `title` and a `description`. Every email starts with a `subject` and a
`preheader`.

## Checks

```sh
python3 scripts/check_content.py
python3 -m pytest
```
