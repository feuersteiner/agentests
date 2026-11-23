# Mapleform content

The words Mapleform ships outside the app's code: the help centre, the lifecycle emails and the
interface strings. Mapleform is an online form builder for small teams.

## Layout

- `content/help/`: help centre articles, one Markdown file per article; `index.md` is the help centre's front page.
- `locales/en.json`: interface strings, loaded by the web app at build time.
- `docs/feature-notes.md`: product notes from the feature teams, the source of facts for new articles. Internal, never published.
- `site.config.json`: the help centre's navigation, the email sequence and support details.
- `scripts/`: small Node checks run before a release.

## Checks

```sh
npm test                          # unit tests of the scripts
node scripts/check-links.mjs      # links between help articles
node scripts/check-locales.mjs    # empty interface strings
```

Nothing needs installing: the scripts use Node 22 built-ins only.

## Support

Questions about this repository go to #content on Slack. Customers reach us at
support@mapleform.example.
