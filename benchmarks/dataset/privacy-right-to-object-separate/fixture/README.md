# Tessellate website and help centre

The public pages of tessellate.example and the articles of the Tessellate help centre, with the
data they draw on and the script that builds the sitemap. Tessellate is the shift-scheduling app
for small teams, made by Tessellate Ltd.

## Layout

- `website/`: pages of tessellate.example, one Markdown file per page. A page's address is its
  path under `website/` without `.md`, so `website/pricing.md` is `/pricing`;
  `website/index.md` is `/`.
  - `index.md`: the home page.
  - `pricing.md`: the pricing page.
  - `privacy.md`: the privacy notice.
- `help/`: help centre articles, one Markdown file each. An article's address is
  `/help/<name>`.
  - `getting-started.md`: making your first rota.
  - `billing.md`: plans, invoices and payment.
- `privacy/data-inventory.md`: our record of what personal data we hold, why, on what basis and
  for how long. Internal: it is not published.
- `data/site.json`: the site name, address, support email and the footer links.
- `data/plans.json`: the plans and their prices. Pages take their plan facts from here.
- `scripts/build_sitemap.py`: builds `sitemap.xml` from the pages and articles.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed on the site, newest first.

## Front matter

Every page and article starts with a `title`, a `description` and `updated`, the date it last
changed, as `YYYY-MM-DD`. The sitemap uses `updated` as each address's last change.

## Checks

```sh
python3 scripts/build_sitemap.py --out sitemap.xml
python3 -m pytest
```

Questions about the site go to the web team at web@tessellate.example. Customers who need help
write to help@tessellate.example.
