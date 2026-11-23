# Tallybird

Tallybird is an invoicing app for freelancers and small studios. This repository holds the app's
customer-facing copy and the small helpers that sit next to it.

## Layout

- `locales/en.json`: the UI strings, by key. Placeholders are written `{name}`.
- `content/onboarding/`: longer in-app copy for the onboarding flow.
- `emails/`: transactional emails, one Markdown file each, with the subject in the front matter.
- `src/format.js`: formatting helpers for money and card numbers.
- `src/parseClients.js`: reads a client list from CSV for the client import.
- `src/onboarding.js`: the onboarding checklist's steps and progress.
- `src/emails.js`: the registry of transactional emails and the events that send them.
- `tests/`: the tests of `src/`.

## Development

Tallybird needs Node 18 or later and has no dependencies to install.

```sh
npm run test:unit
```
