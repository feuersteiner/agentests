# Orbitly content

The text Orbitly ships outside the app's code: the interface strings and the help centre. Orbitly
is a project-management tool for teams.

## Layout

- `locales/en.json`: the interface strings in English, the source for every other language.
- `locales/de.json`, `locales/ja.json`: the German and Japanese strings, returned by the translators. Never edit these by hand.
- `content/help/`: help centre articles, one Markdown file per article; `index.md` is the help centre's front page.
- `docs/feature-notes.md`: product notes from the feature teams, the source of facts for new strings and articles. Internal, never published.
- `translation.config.json`: the target languages, the files sent for translation and the translators' turnaround.
- `scripts/`: small Node scripts for the translation batches.

## Translation

Every string in `locales/en.json` and every help article listed under `helpArticles` in
`translation.config.json` goes to the translators in the weekly batch. They return the German and
Japanese files within five days. Until then, a new string shows in English in the other languages.

## Checks

```sh
npm test                             # unit tests of the scripts
node scripts/missing-keys.mjs de     # strings a translation does not have yet
node scripts/word-count.mjs          # words in the next batch, for the translators' quote
```

Nothing needs installing: the scripts use Node 22 built-ins only.

## Contact

Questions about this repository go to #content on Slack.
