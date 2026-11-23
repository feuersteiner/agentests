# Quiltboard marketing copy

The customer-facing copy for Quiltboard, the online whiteboard for product teams: the website
pages, emails and social posts, the plan data, and a small checker.

## Layout

- `website/`: pages of quiltboard.example, one Markdown file per page. A page's address is its path
  under `website/` without `.md`, so `website/pricing.md` is `/pricing`; `website/index.md` is `/`.
  - `index.md`: the home page.
  - `pricing.md`: the pricing page.
- `marketing/`: emails and social posts, one Markdown file each.
  - `october-update-email.md`: the October product update, sent to customers.
- `docs/`: notes for whoever writes copy.
  - `brand-voice.md`: how we write.
  - `offers/three-months-free.md`: the brief for the three months free offer.
- `data/plans.json`: the plans and their prices. Copy takes its plan facts from here.
- `data/emails.json`: who each email goes to and when it is sent.
- `data/social.json`: our social media accounts.
- `scripts/check_copy.py`: checks the front matter and the internal links of every page, email and
  post.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed in the copy, newest first.

## Front matter

Every page under `website/` starts with a `title` and a `description`. Every email, a file under
`marketing/` whose name ends in `-email.md`, starts with a `subject` and a `preheader`. Every other
file under `marketing/` starts with a `title`.

## Checks

```sh
python3 scripts/check_copy.py
python3 -m pytest
```

Questions about the copy go to the growth team at growth@quiltboard.example.
