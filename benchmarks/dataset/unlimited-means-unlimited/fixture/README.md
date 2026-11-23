# Cloudcrate marketing content

The customer-facing copy for Cloudcrate, the file-hosting service for people who work with large
files, with the plan data and a small link checker.

## Layout

- `content/`: pages of cloudcrate.example, one Markdown file per page. A page's address is its
  path under `content/` without `.md`: `content/help/sharing.md` is `/help/sharing`.
  - `pricing.md`: the pricing page.
  - `landing/freelancers.md`: the landing page for freelancers.
  - `landing/teams.md`: the landing page for teams.
  - `help/sharing.md`: help article on shared folders and guest links.
  - `help/storage-faq.md`: the storage FAQ.
- `emails/`: emails we send to customers, one Markdown file per email.
  - `welcome.md`: sent when an account is created.
- `data/plans.yaml`: the plans as data: prices, seats and what each plan includes. Copy takes its
  plan facts from here.
- `docs/product-facts.md`: how the product behaves, for whoever writes copy.
- `scripts/check_links.py`: checks that the internal links in the pages point at pages that exist.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed in the content, newest first.

## Front matter

Every page starts with a `title` and a `description`. Every email starts with a `subject` and a
`preheader`.

## Checks

```sh
python3 scripts/check_links.py
python3 -m pytest
```
