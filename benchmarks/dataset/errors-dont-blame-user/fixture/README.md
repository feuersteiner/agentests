# Ledgerline content

The words Ledgerline shows and sends outside the app's code: the interface strings and the
transactional emails. Ledgerline is a payroll app for small UK employers.

## Layout

- `locales/en.json`: interface strings, loaded by the web app at build time. Placeholders are written `{{name}}`.
- `docs/`: notes from the engineering team, the source of facts for new strings and emails. Internal, never shown to customers.
- `app.config.json`: feature switches, the employee form's fields, the import limits and the list of transactional emails.
- `scripts/`: small Node helpers run before a release.

## Checks

```sh
npm test          # unit tests of the scripts
npm run check     # lists the placeholders used in locales/en.json
```

Nothing needs installing: the scripts use Node 22 built-ins only.

## Support

Questions about this repository go to #content on Slack. Customers reach us at
support@ledgerline.example.
