# Kilowatch website content

The copy for kilowatch.example and for the sales team. Kilowatch is an electricity-monitoring
service for small businesses: a sensor on the meter, a dashboard, and alerts when something runs
when it should not. This repository also holds the small tools we use to keep the copy tidy.

## Layout

- `content/landing/`: landing pages, one Markdown file per page.
  - `home.md`: the home page.
  - `pricing.md`: the pricing page.
- `content/sales/`: speaker notes for the sales deck, one Markdown file per section.
  - `overview.md`: who Kilowatch is for.
  - `product.md`: the sensor, the dashboard and the alerts.
- `docs/case-studies/`: write-ups of our customer interviews, one file per customer.
- `docs/data/outcomes-2026.md`: what customers saved in their first year, from the data team.
- `docs/product-facts.md`: what Kilowatch does and what the plans include. Copy takes its facts
  from here.
- `data/plans.json`: the plans as data, read by the pricing page. Prices are in pence.
- `site.config.json`: the site's navigation, the deck's sections and the support details.
- `scripts/`: the tools, each with its tests beside it.
- `CHANGELOG.md`: what changed, newest first.

## Front matter

Every file under `content/` starts with a `title` and a `description`.

## Checks

```sh
node scripts/front-matter.mjs
node --test
```
