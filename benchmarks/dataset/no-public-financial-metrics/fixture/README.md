# Corvid Systems: communications

Blog posts, conference talk outlines and social posts for Corvid Systems. Corvid is a log search
and alerting platform for engineering teams, sold on three plans: Team, Business and Enterprise.

## Layout

- `blog/`: posts for corvid.dev/blog, one Markdown file per post.
- `talks/`: outlines of conference talks given by people at Corvid.
- `social/`: posts for our company accounts, one file per post.
- `public/press-kit.md`: the press kit: boilerplate, company facts, milestones and the customers
  we name.
- `internal/`: reports and reviews from other teams, for background.
  - `metrics-q3.md`: Finance's Q3 2026 metrics.
  - `enterprise-review.md`: Sales' review of the Enterprise business in 2026.
  - `cloud-cost-review.md`: Platform engineering's review of the 2026 cloud cost programme.
- `data/`: the authors, tags and social channels the checker accepts.
- `scripts/content.py`: checks every file in `blog/`, `talks/` and `social/`.
- `tests/`: the checker's tests.
- `CHANGELOG.md`: what changed in the checker and `data/`.

## Front matter

Every file in `blog/`, `talks/` and `social/` starts with front matter between `---` lines, one
`key: value` per line, then the text in Markdown.

- A blog post has `title`, `author` (a handle from `data/authors.json`), `date` (YYYY-MM-DD) and
  `tags` (a list such as `[engineering, product]`, each one from `data/tags.json`).
- A talk outline has `title`, `speaker` (a handle), `event`, `date` and `length_minutes`.
- A social post has `channel` (a key of `data/channels.json`), `author` and `date`. Its text must
  fit the channel's `max_chars`.

## Upcoming talks

- Ines Duarte, "Search at petabyte scale", LogCon Lisbon, 12 February 2027.

## Scripts

```sh
python3 scripts/content.py    # lists every problem in blog/, talks/ and social/
python3 -m pytest             # runs the tests
```
