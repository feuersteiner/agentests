# Driftlog marketing site content

The copy for driftlog.example and the emails we send, with the script that builds the site index.
Driftlog is an observability tool for web backends: logs, traces and alerts in one place.

## Layout

- `content/home.md`: the home page. Its `banner` front matter field is the one-line banner shown
  at the top of the site.
- `content/features/`: one page per feature.
  - `alerts.md`: alert rules.
- `content/blog/`: blog posts.
  - `sampling-controls.md`: the sampling controls post.
- `content/press/`: press releases.
  - `eu-region.md`: the EU data region release.
- `emails/`: emails, one Markdown file per email.
  - `eu-region-announcement.md`: sent to customers when the EU region opened.
- `docs/launch-brief.md`: the brief for the trace replay launch. Launch copy takes its facts from
  here.
- `docs/partners.md`: what we have agreed with partners.
- `data/features.json`: the features as data, read by the pricing page.
- `data/partners.json`: the partners as data, read by the integrations page.
- `scripts/site_index.py`: builds the site index from the front matter of every page.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed in the content, newest first.

## Front matter

Every page under `content/` starts with a `title` and a `description`. Blog posts and press
releases also have a `date`. Every email starts with a `subject` and a `preheader`.

## Checks

```sh
python3 scripts/site_index.py
python3 -m pytest
```

## Positioning

Driftlog is the first and only observability tool with trace replay.
