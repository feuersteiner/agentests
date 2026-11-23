# Regex search is now four times faster

_Published 12 August_

Regular expression searches used to be the slowest thing you could ask Brindle to do. On a large
monorepo, a pattern such as `log\.(warn|error)\(` could take several seconds, and searches across
a repository's whole commit history sometimes hit the 30-second timeout.

## What changed

We rebuilt the trigram index so that it also stores the position of each trigram in its line.
The search engine now discards most candidate files before it runs the regular expression at all,
instead of after.

- The median regex search across a workspace dropped from 1.9 seconds to 0.45 seconds.
- Searches across commit history no longer time out on any repository we index.
- Saved searches and search alerts that use regular expressions run on the new index too.

## What you need to do

Nothing. Every workspace moved to the new index over the past two weeks. If a search still feels
slow, feel free to tell us on the community forum, with the pattern you used.
