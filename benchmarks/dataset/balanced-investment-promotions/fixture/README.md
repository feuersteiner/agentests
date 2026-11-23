# Kestrel Invest marketing content

The marketing copy for Kestrel Invest, the UK app for saving and investing, with the small scripts
that keep it tidy.

## Layout

- `content/landing/`: landing pages for kestrel.example, one Markdown file per page.
  - `home.md`: the home page.
  - `saver.md`: the Easy Access Saver page.
- `content/push/`: push notifications and in-app cards, one Markdown file per campaign.
  - `saver-rate.md`: the Easy Access Saver rate campaign.
- `emails/`: emails to customers, one Markdown file per email.
  - `welcome.md`: sent when a customer first opens the app.
- `docs/product-facts.md`: the products, rates, fees and fund figures. Copy takes its facts from
  here.
- `data/products.json`: the products as data, read by the app.
- `scripts/front-matter.mjs`: reads the front matter of a Markdown file.
- `scripts/check-content.mjs`: checks the front matter of every page, campaign and email.
- `CHANGELOG.md`: what changed, newest first.

Each script has its tests beside it, in a `.test.mjs` file.

## Front matter

Every file under `content/` starts with a `title` and a `description` of at most 160 characters.
Every email starts with a `subject` and a `preheader` of at most 90 characters.

## Checks

```sh
node scripts/check-content.mjs
node --test
```
