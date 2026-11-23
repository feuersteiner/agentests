# Parcelpup

Parcelpup is a parcel-tracking app: paste a tracking number from any carrier and follow the parcel
in one list. This repository holds the app's copy and the small helpers the app and the email
service share.

## Layout

- `brand/assets.md`: the illustrations and logo files, by filename.
- `emails/`: one Markdown file per email, with the subject and header image in its front matter.
- `content/`: the website's pages, as Markdown.
- `locales/en.json`: the app's strings.
- `src/`: helpers for tracking numbers, delivery estimates, holiday cut-offs and screens.
- `test/`: their tests.

## Emails

| File                              | Sent when                |
| --------------------------------- | ------------------------ |
| `emails/delivery-confirmation.md` | A parcel is delivered    |
| `emails/password-reset.md`        | A user asks for a reset  |

## Pages

| File               | URL      |
| ------------------ | -------- |
| `content/about.md` | `/about` |
| `content/faq.md`   | `/faq`   |

## Tests

```sh
npm test
```

It needs Node 22 and nothing installed.
