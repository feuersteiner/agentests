# mapleform-content

What Mapleform tells its customers about the product: the release notes, the changelog in the form
builder and the product emails, with the script that checks them before they are published.
Mapleform is an online form builder for clubs, schools and small clinics.

## Layout

- `docs/changes/`: what went into each release and sprint, as the engineers left it: commit
  messages and ticket titles.
- `content/release-notes/`: the notes for each numbered release, published at
  mapleform.example/releases. One file per release, named after its version, such as `v4-1.md`.
- `content/changelog.md`: the "What's changed" panel in the form builder. Each two-week sprint
  gets an entry at the top.
- `emails/`: the emails we send to customers, in Markdown with front matter.
- `emails/schedule.yaml`: when each email goes out, and to whom.
- `scripts/check_content.py`: checks the front matter of the release notes and emails.
- `tests/`: the tests of the script.

## Checking content

Check the release notes and emails:

```sh
python3 scripts/check_content.py
```

It prints one line per problem and exits with 1 when it finds any.

Run the tests:

```sh
python3 -m pytest
```
