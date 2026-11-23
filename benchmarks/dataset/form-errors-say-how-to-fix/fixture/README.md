# Rentready forms content

The words of Rentready's online forms, kept apart from the web app's code: the interface strings
of the tenant application and the guarantor form, and the engineering notes they are written from.
Rentready lets tenants in England apply to rent a home online.

## Layout

- `locales/en.json`: the tenant application's strings, loaded by the web app at build time. Variables are written `{{name}}`.
- `docs/`: notes from the engineering team on each form: its fields, the checks they run and the keys they look up. Internal, never shown to applicants.
- `app.config.json`: the forms, their steps and switches, the holding deposit and the support address.
- `scripts/`: small Node helpers, shared with the web app.

## Checks

```sh
npm test                          # unit tests of the scripts
npm run keys -- locales/en.json   # lists every key of a strings file
```

Nothing needs installing: the scripts use Node 22 built-ins only.

## Support

Questions about this repository go to #forms on Slack. Applicants reach us at
support@rentready.example.
