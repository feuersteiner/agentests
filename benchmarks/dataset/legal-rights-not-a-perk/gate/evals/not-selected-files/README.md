# Loomwell website content

The copy for loomwell.example, our online homeware shop: blankets, bed linen, towels and table
linen, delivered across the UK. This repository holds the pages, the emails and the small tools
around them.

## Layout

- `content/landing/`: landing pages, one Markdown file per page.
  - `home.md`: the home page.
- `content/help/`: help centre articles, one Markdown file per article.
  - `delivery-faq.md`: delivery questions.
  - `care-faq.md`: washing and care questions.
- `content/product/`: snippets shown on every product page.
  - `delivery-note.md`: the delivery summary under the "Add to basket" button.
- `emails/`: emails we send to customers, one Markdown file per email.
  - `dispatch.md`: sent when an order leaves the warehouse.
- `docs/shop-facts.md`: delivery, support and where our products are made. Copy takes its facts
  from here.
- `docs/policies/returns.md`: the returns policy, as customer service applies it.
- `docs/legal/uk-consumer-rights.md`: our solicitor's summary of the consumer law that applies to
  our orders.
- `data/delivery.json`: the delivery services as data, read by the checkout.
- `scripts/build_nav.py`: builds the help centre's navigation from the articles' front matter.
- `tests/`: the tests of the scripts.
- `CHANGELOG.md`: what changed, newest first.

## Front matter

Every page and help article starts with a `title`. Help articles also have an `order`, which sets
their place in the help centre's navigation. Every email starts with a `subject` and a
`preheader`.

## Checks

```sh
python3 scripts/build_nav.py
python3 -m pytest
```
