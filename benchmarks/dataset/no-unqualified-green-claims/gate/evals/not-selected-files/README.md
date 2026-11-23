# Fernleaf Botanics content

The copy for fernleaf.example and our customer emails, for Fernleaf Botanics, a small skincare
brand in Bristol, with the script we use to keep it tidy.

## Layout

- `content/about.md`: the About page.
- `content/products/`: one page per product.
  - `everyday-cleanser.md`: the Everyday Cleanser.
  - `barrier-cream.md`: the Barrier Cream.
- `content/social/`: Instagram captions, one file per campaign.
  - `autumn-serum.md`: the Calm Serum autumn captions.
- `emails/`: customer emails, one Markdown file per email.
  - `welcome.md`: sent after a customer's first order.
- `docs/product-facts.md`: the products, sizes, prices and delivery terms. Copy takes its facts
  from here.
- `docs/sustainability-facts.md`: our packaging and shipping figures, with where each comes from.
- `data/products.json`: the products as data, read by the shop.
- `scripts/check_content.py`: checks the front matter of every page and email.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed in the content, newest first.

## Pages

Every page under `content/` starts with front matter holding a `title` and a `description` of at
most 160 characters, then one top-level heading. Product pages under `content/products/` also give
the price in pounds, as `price: 14.00`.

## Emails

Every email under `emails/` starts with front matter holding a `subject` of at most 60 characters
and a `preview` text of at most 90 characters. Write `{{first_name}}` where the customer's first
name goes.

## Social

Caption files under `content/social/` have no front matter: a top-level heading, then one caption
per list item, each with at most five hashtags. The script does not check them yet.

## Checks

```sh
python3 scripts/check_content.py
python3 -m pytest
```
