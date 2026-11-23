# Quillnote site content

The pages of quillnote.example that are not part of the app: the help centre, the pricing page and
the small scripts that build them. Quillnote is a note-taking app for the web, Windows, macOS, iOS
and Android, with notes that sync across devices.

## Layout

- `content/help/`: help centre articles, one Markdown file each, with the title in the front matter.
- `content/pricing.md`: the pricing page.
- `data/plans.json`: plans, prices and limits, read by the pricing page and the in-app upgrade screen.
- `docs/`: notes from the product team, the source of facts for new articles. `shipped.md` says what
  each release does and `roadmap.md` lists the work in progress.
- `site.config.json`: the help centre's navigation, the footer links and the support address.
- `scripts/`: small Node helpers used by the build.

## Checks

```sh
npm test          # unit tests of the scripts
```

Nothing needs installing: the scripts use Node 22 built-ins only.

## Support

Questions about this repository go to #help-centre on Slack. Customers write to
support@quillnote.example.
