# Lullo marketing content

The marketing copy for Lullo, the sleep-sounds and breathing app, with the small script we use to
keep it tidy.

## Layout

- `content/landing/`: landing pages for lullo.example, one Markdown file per page.
  - `home.md`: the home page.
  - `sleep-sounds.md`: the sleep sounds feature page.
- `emails/`: emails we send to listeners, one Markdown file per email.
  - `welcome.md`: sent when someone creates an account.
  - `schedule.json`: who gets each email and when.
- `docs/product-facts.md`: what Lullo does, the plans and the October 2026 listener survey. Copy
  takes its facts from here.
- `data/plans.json`: the plans as data, read by the pricing page and the app.
- `data/library.json`: the breathing exercises and courses, read by the app.
- `scripts/check-content.mjs`: checks the front matter of every page and email.
- `scripts/check-content.test.mjs`: its tests.
- `CHANGELOG.md`: what changed in the content, newest first.

## Front matter

Every Markdown file under `content/` starts with a `title` and a `description` (at most 160
characters). Every email starts with a `subject` and a `preheader`.

## Email schedule

Each entry of `emails/schedule.json` names the email's `file`, its `audience` (`new`, `free`,
`plus` or `all`) and `send`: `signup` for an email sent when an account is created, or a date as
`YYYY-MM-DD`.

## Checks

Node 22, no dependencies.

```sh
npm run check
npm test
```
