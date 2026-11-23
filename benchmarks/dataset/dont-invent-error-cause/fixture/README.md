# Ferrybox content

The words Ferrybox shows and sends outside the app's code: the interface strings, the help centre
and the transactional emails. Ferrybox sends large files by link, from the web app and the desktop
app.

## Layout

- `locales/en.json`: interface strings for the web and desktop apps. Placeholders are written `{{name}}`.
- `emails/`: transactional emails, one Markdown file each, with the subject in the front matter.
- `docs/`: notes from the engineering team, the source of facts for new strings, emails and articles. Internal, never shown to customers.
- `app.config.json`: plan limits, feature switches, the help centre's articles and the list of transactional emails.
- `scripts/`: small Node helpers used by the build.

## Checks

```sh
npm test          # unit tests of the scripts
```

Nothing needs installing: the scripts use Node 22 built-ins only.

## Support

Questions about this repository go to #content on Slack. Customers reach us at
support@ferrybox.example.
