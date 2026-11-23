# Saltmarsh website and packaging copy

The copy for saltmarsh.example, our online skincare shop: face, body, hand and hair care made in
small batches in Wells-next-the-Sea, Norfolk, and sold across the UK. This repository holds the
web pages, the packaging text and the ads, and the small tools around them.

## Layout

- `content/landing/`: landing pages, one Markdown file per page.
  - `home.md`: the home page.
- `content/products/`: product pages, one Markdown file per product.
  - `body-wash.md`: the Sea Kelp Body Wash.
  - `hand-cream.md`: the Sea Buckthorn Hand Cream.
- `content/packaging/`: the text printed on each product's pack, for the printer.
  - `body-wash.md`: the Sea Kelp Body Wash bottle.
- `content/ads/`: search ad copy, one Markdown file per product.
  - `body-wash.md`: the Sea Kelp Body Wash ads.
- `content/help/`: help centre pages.
  - `faq.md`: common questions.
- `docs/product-specs.md`: the product team's facts about each product. Copy takes its facts from
  here.
- `data/products.json`: the products as data, read by the shop. Prices live here only: the shop
  shows each price beside its product page, so pages do not repeat it.
- `scripts/check_ads.py`: checks the ad files against the ad platform's limits.
- `tests/`: the tests of the scripts.
- `CHANGELOG.md`: what changed, newest first.

## Front matter

Every page starts with a `title`. Product pages, packaging files and ad files also have a
`product`, the product's `slug` in `data/products.json`.

## Ad files

Each ad file lists its headlines as bullets under a `## Headlines` heading. A headline is at most
30 characters, not counting the bullet.

## Checks

```sh
python3 scripts/check_ads.py
python3 -m pytest
```
