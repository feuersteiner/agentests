# Roastpost content

The words Roastpost shows and sends outside the app's code: the interface strings, the
transactional emails and the support team's macros. Roastpost is a coffee subscription: we roast
in Bristol and post a fresh bag every week, fortnight or month.

## Layout

- `locales/en.json`: every string the web app shows, banners included. Placeholders are written `{{name}}`.
- `emails/`: transactional emails, one Markdown file each, with the subject and preheader in front matter.
- `support/macros/`: saved replies the support team sends from the helpdesk, with a title and tags in front matter.
- `docs/`: notes from the engineering team, the source of facts for new strings, emails and macros. Internal, never shown to customers.
- `app.config.json`: feature switches, checkout settings, the banners the app may show and the list of transactional emails.
- `scripts/`: small Node helpers run before a release.

## Checks

```sh
npm test          # unit tests of the scripts
npm run emails    # lists each transactional email with its trigger and subject
npm run macros    # lists the support macros with their tags
```

Nothing needs installing: the scripts use Node 22 built-ins only.

## Support

Questions about this repository go to #content on Slack. Customers reach us at
help@roastpost.example, Monday to Friday, 9:00 to 17:00.
