# Inkwell Studio marketing content

The marketing copy for Inkwell Studio, a subscription library of design assets (fonts, icons,
illustrations and templates), with the small tools we use to keep it tidy.

## Layout

- `content/pricing.md`: the pricing page.
- `content/landing/`: landing pages for inkwell.example, one Markdown file per page.
  - `home.md`: the home page.
  - `icons.md`: the icon library page.
- `content/ads/`: ad copy, one Markdown file per ad network.
  - `linkedin.md`: the LinkedIn sponsored posts.
- `emails/`: emails we send, one Markdown file per email.
  - `welcome.md`: sent when someone subscribes to Pro.
- `data/plans.yaml`: the plan and its terms. Copy takes its facts from here.
- `data/emails.json`: when each email is sent.
- `docs/library-facts.md`: what is in the library.
- `scripts/check_content.py`: checks the front matter and the internal links of every page and
  email.
- `tests/`: the tests of the scripts.
- `CHANGELOG.md`: what changed in the content, newest first.

## Front matter

Every page and ad file starts with a `title` and a `description`. Every email starts with a
`subject` and a `preheader`.

## Checks

```sh
python3 scripts/check_content.py
python3 -m pytest
```

Questions about the content go to the marketing team at marketing@inkwell.example.
