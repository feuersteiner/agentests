# Driftwood Coffee Co. site copy

The copy for driftwood.example, the shop of Driftwood Coffee Co., a roaster in Rotterdam that sells
single-origin coffee by subscription in the Netherlands, Belgium and Germany. The repository holds
the pages, the emails we send to customers, the shop's interface text and a small checker.

## Layout

- `content/`: pages of driftwood.example, one Markdown file per page. A page's address is its path
  under `content/` without `.md`: `content/products/colombia.md` is `/products/colombia`.
  - `subscriptions.md`: how the subscription works.
  - `products/colombia.md`: the product page for the Colombia Huila.
- `emails/`: emails to customers, one Markdown file per email.
  - `welcome.md`: sent when someone starts a subscription.
  - `newsletter-2026-10.md`: the October newsletter.
- `locales/`: the shop's interface text, one JSON file per language. `en.json` is the source;
  translators add the keys it gains to `de.json`.
- `data/coffees.json`: the coffees we sell, with their slug, origin, price per 250 g bag and whether
  they are available.
- `docs/coffees.md`: our green coffee buyer's notes on each coffee, for whoever writes copy.
- `docs/climate.md`: operations' notes on our climate work, for whoever writes copy.
- `scripts/check_site.py`: checks the front matter of the pages and emails, and the locale files.
- `tests/`: the tests of the checker.
- `CHANGELOG.md`: what changed, newest first.

## Front matter

Every page starts with a `title` and a `description` of at most 160 characters. A product page also
has `coffee`, the coffee's slug in `data/coffees.json`. Every email starts with a `subject` and a
`preheader`.

## Product pages

A product page has these sections, in this order: Tasting notes, From the farm, Brewing, Delivery.

## Checks

```sh
python3 scripts/check_site.py
python3 -m pytest
```
