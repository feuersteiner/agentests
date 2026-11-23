# Shelfwise merchant comms

Everything Shelfwise says to merchants outside the product's code: status page posts, emails,
in-app strings and the macros the support team sends. Shelfwise is a storefront app for
independent shops.

## Layout

- `content/status/`: posts for status.shelfwise.app, one Markdown file per post, and
  `components.yaml`, the components the status page lists.
- `emails/`: emails to merchants, one Markdown file each, listed in `emails/index.yaml`.
- `locales/en.json`: the admin app's English strings.
- `support/macros/`: replies the support team sends from the help desk.
- `docs/incidents/`: internal incident notes. Not published.
- `app.config.json`: where the admin app shows each banner.
- `scripts/check_content.py`: checks front matter, components and placeholders.

## Front matter

- Status posts: `title`, `state` (investigating, identified, monitoring or resolved) and
  `components`, a comma-separated list of ids from `content/status/components.yaml`.
- Emails: `subject` and `preheader`.
- Macros: `title` and `tags`.

## Support macros

- `custom-domain`: connecting a custom domain.
- `billing/refund-timing`: when a refund reaches the merchant's card.

## Checks

```sh
python3 scripts/check_content.py
python3 -m pytest
```
