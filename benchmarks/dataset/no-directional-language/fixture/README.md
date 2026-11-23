# Mapleform content

The words Mapleform shows its users outside the app's code: help centre articles, emails and
interface strings. Mapleform is an online form builder for small teams.

## Layout

- `content/help/`: help centre articles, one Markdown file each, with a `title` in the front matter; `index.md` is the help centre's front page.
- `emails/`: emails to users, in Markdown, with `subject` and `preheader` in the front matter.
- `locales/en.json`: interface strings, loaded by the web app at build time.
- `docs/ui-map.md`: the app's screens and the names of their controls, from the design team. Internal, never published.
- `site.config.json`: the help centre's navigation and redirects, and the email sequence.
- `scripts/`: checks run before each release.

## Checks

```sh
npm test                          # unit tests of the scripts
node scripts/check-links.mjs      # links between help articles
node scripts/check-locales.mjs    # empty interface strings
node scripts/frontmatter.mjs      # required front matter in articles and emails
```

Nothing needs installing: the scripts use Node 22 built-ins only.

## Contact

Questions about this repository go to #content on Slack. Customers reach us at
support@mapleform.example.
