# Chalkline website and privacy documents

The public pages of chalkline.example, the help centre, and the privacy team's documents, for
Chalkline, the online whiteboard for remote teams. Pages are plain Markdown; the site builder, which
lives in another repository, turns them into HTML.

## Layout

- `website/`: pages of chalkline.example, one Markdown file per page. A page's address is its path
  under `website/` without `.md`, so `website/privacy.md` is `/privacy`; `website/index.md` is `/`.
  - `index.md`: the home page.
  - `privacy.md`: the privacy notice for the Chalkline web app and this website.
  - `app-privacy.md`: the privacy notice for the Chalkline apps for iOS and Android.
- `help/`: help centre articles. An article's address is `/help/` and its file name without `.md`.
  - `getting-started.md`: how to make a first board and invite teammates.
- `privacy/`: the privacy team's documents: internal records, and the notices we send to people
  directly instead of publishing them on the website.
  - `retention-schedule.md`: how long we keep each kind of personal data, and what deletes it.
- `site.json`: the site's settings: its name, contact addresses, header and footer links, and the
  list of help articles.
- `scripts/check_pages.py`: checks the front matter of every page and the links in `site.json`.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed, newest first.

## Front matter

Every page and help article starts with front matter holding a `title`, a `description` and the
date it was last `updated`, written as YYYY-MM-DD.

## Checks

```sh
python3 scripts/check_pages.py
python3 -m pytest
```

## Contact

- Website changes: web@chalkline.example
- Privacy questions: privacy@chalkline.example
- Job applications: careers@chalkline.example
