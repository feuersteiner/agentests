# Quillnote marketing content

The marketing copy for Quillnote, the note-taking app, with the small tools we use to keep it
tidy.

## Layout

- `content/pricing.md`: the pricing page.
- `content/landing/`: landing pages for quillnote.example, one Markdown file per page.
  - `home.md`: the home page.
- `content/push/`: push notifications, one Markdown file per series.
  - `onboarding.md`: sent during a new user's first week.
- `emails/`: emails we send to users, one Markdown file per email.
  - `welcome.md`: sent when someone signs up.
  - `schedule.yaml`: which email goes to whom, and when.
- `data/plans.json`: the plans and their prices.
- `data/offers.yaml`: the current offers and their terms. Copy takes its facts from here and from
  `data/plans.json`.
- `site/nav.yaml`: the site's navigation.
- `scripts/pricing.py`: works out the yearly prices from the plans and offers.
- `scripts/check_content.py`: checks the front matter of every page and the length of every push
  notification.
- `tests/`: the tests of the scripts.
- `CHANGELOG.md`: what changed in the content, newest first.

## Formats

Every page and push series starts with front matter holding a `title` and a `description`. Every
email starts with a `subject` and a `preheader`.

A push series has one `##` section per notification, with a `Title:` line and a `Body:` line. A
push title is at most 40 characters and a body at most 120.

## Checks

```sh
python3 scripts/check_content.py
python3 -m pytest
```
